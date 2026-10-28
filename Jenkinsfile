pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '1', artifactNumToKeepStr: '1'))
        disableConcurrentBuilds()
        timestamps()
        skipDefaultCheckout(true)
    }

    stages {
        stage('Checkout Repo') {
            steps {
                checkout scm
            }
        }

        stage('Build & Typecheck (Contenedor Node)') {
            agent {
                docker {
                    image 'node:24-alpine'
                    reuseNode true
                    args '-v fe-bomberos-npm-cache:/root/.npm'
                }
            }
            steps {
                sh '''
                    npm ci --prefer-offline --no-audit
                    npm run typecheck
                    npm run test:coverage
                    npm run build
                '''
            }
        }

        stage('SonarQube Analysis') {
            when {
                anyOf {
                    branch 'qa'
                    branch 'uat'
                }
            }
            agent {
                dockerfile {
                    filename 'Dockerfile.ci'
                    reuseNode true
                }
            }
            environment {
                scannerHome = tool 'SonarScanner'
            }
            steps {
                script {
                    def sonarUserHome = "${env.WORKSPACE}/.sonar"

                    withEnv(["SONAR_USER_HOME=${sonarUserHome}"]) {
                        sh 'node --version'
                        sh 'java --version'

                        if (env.BRANCH_NAME == 'qa') {
                            withSonarQubeEnv('SonarQube-Server') {
                                sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectKey=FE-BOMBEROS-QA -Dsonar.nodejs.executable=/usr/local/bin/node -Dsonar.userHome=${sonarUserHome}"
                            }
                        } else {
                            withSonarQubeEnv('SonarQube-Server') {
                                sh "${scannerHome}/bin/sonar-scanner -Dsonar.projectKey=FE-BOMBEROS-UAT -Dsonar.nodejs.executable=/usr/local/bin/node -Dsonar.userHome=${sonarUserHome}"
                            }
                        }
                    }
                }
            }
        }

        stage('Quality Gate') {
            when {
                anyOf {
                    branch 'qa'
                    branch 'uat'
                }
            }
            steps {
                timeout(time: 1, unit: 'HOURS') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Build y Trivy') {
            when { branch 'qa' }
            environment {
                TRIVY_IMAGE = 'aquasec/trivy:0.58.1'
                IMAGEN_QA = "bomberos-frontend-qa:${env.BUILD_NUMBER}"
            }
            steps {
                withCredentials([file(credentialsId: 'BOMBEROS_FRONTEND_QA', variable: 'SECRET_FILE')]) {
                    sh '''
                        set -eu
                        rm -f .env
                        cp "$SECRET_FILE" .env

                        # Construir la imagen del frontend con el nombre explícito
                        docker compose -p bomberos-frontend-qa -f docker-compose.qa.yml build --pull

                        # Etiquetar la imagen construida (compose usa un nombre por defecto)
                        # En docker-compose.qa.yml, la imagen se llama "bomberos-frontend-qa-frontend-app"
                        docker tag bomberos-frontend-qa-frontend-app:latest "$IMAGEN_QA"

                        # Escanear con Trivy
                        TRIVY="docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache/ ${TRIVY_IMAGE}"

                        # Reporte HTML (siempre se genera)
                        $TRIVY image --scanners vuln --severity LOW,MEDIUM,HIGH,CRITICAL \
                            --format template --template "@/contrib/html.tpl" \
                            "$IMAGEN_QA" > trivy-frontend-report.html

                        # Compuerta: MEDIUM, HIGH o CRITICAL detienen el pipeline
                        $TRIVY image --scanners vuln --severity MEDIUM,HIGH,CRITICAL \
                            --exit-code 1 --no-progress \
                            "$IMAGEN_QA"
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-frontend-report.html', allowEmptyArchive: true
                    sh "docker rmi -f bomberos-frontend-qa-frontend-app:latest || true"
                    sh "docker rmi -f ${env.IMAGEN_QA} || true"
                }
            }
        }

        stage('Deploy Dev (Docker Compose)') {
            when {
                branch 'development'
            }
            steps {
                withCredentials([file(credentialsId: 'BOMBEROS_FRONTEND_DEV', variable: 'SECRET_FILE')]) {
                    withEnv(['COMPOSE_PROJECT=bomberos-frontend-development']) {
                        sh '''
                            set -eu
                            rm -f .env
                            cp "$SECRET_FILE" .env
                            docker compose -p "$COMPOSE_PROJECT" -f docker-compose.dev.yml down
                            docker compose -p "$COMPOSE_PROJECT" -f docker-compose.dev.yml up -d --build
                        '''
                    }
                }
            }
        }

        stage('Deploy QA (Docker Compose)') {
            when {
                branch 'qa'
            }
            steps {
                withCredentials([file(credentialsId: 'BOMBEROS_FRONTEND_QA', variable: 'SECRET_FILE')]) {
                    withEnv(['COMPOSE_PROJECT=bomberos-frontend-qa']) {
                        sh '''
                            set -eu
                            rm -f .env
                            cp "$SECRET_FILE" .env
                            docker compose -p "$COMPOSE_PROJECT" -f docker-compose.qa.yml down
                            docker compose -p "$COMPOSE_PROJECT" -f docker-compose.qa.yml up -d --build
                        '''
                    }
                }
            }
        }

        stage('E2E Tests') {
            when {
                branch 'qa'
            }
            agent {
                docker {
                    image 'mcr.microsoft.com/playwright:v1.64.1-jammy'
                    reuseNode true
                }
            }
            environment {
                PLAYWRIGHT_BASE_URL = 'https://qa-bomberos.ingsoftware.lat'
            }
            steps {
                sh '''
                    npm ci --prefer-offline --no-audit
                    npx playwright test --reporter=list
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'playwright-report/**, test-results/**', allowEmptyArchive: true
                }
            }
        }

        stage('OWASP ZAP - Frontend') {
            when { branch 'qa' }
            steps {
                script {
                    def status = sh(
                        script: '''
                            set +x
                            mkdir -p zap-reports
                            chmod 0777 zap-reports

                            NOMBRE="zap-frontend-$$"

                            docker run -d --name "$NOMBRE" --entrypoint sleep ghcr.io/zaproxy/zaproxy:stable 3600 > /dev/null
                            docker exec -u root "$NOMBRE" mkdir -p /zap/wrk
                            docker exec -u root "$NOMBRE" chmod -R 0777 /zap/wrk

                            docker cp zap/frontend-rules.conf "$NOMBRE":/zap/wrk/frontend-rules.conf

                            ESTADO=0
                            docker exec "$NOMBRE" zap-full-scan.py \
                                -t https://qa-bomberos.ingsoftware.lat \
                                -j \
                                --client-spider \
                                -m 5 \
                                -T 15 \
                                -c frontend-rules.conf \
                                -r frontend-zap.html \
                                -J frontend-zap.json || ESTADO=$?

                            docker cp "$NOMBRE":/zap/wrk/frontend-zap.html zap-reports/ 2>/dev/null || true
                            docker cp "$NOMBRE":/zap/wrk/frontend-zap.json zap-reports/ 2>/dev/null || true
                            docker rm -f "$NOMBRE" > /dev/null

                            exit $ESTADO
                        ''',
                        returnStatus: true
                    )

                    if (status == 1) {
                        error('ZAP Frontend: reglas de seguridad incumplidas (FAIL)')
                    } else if (status == 2) {
                        unstable('ZAP Frontend: advertencias detectadas (WARN)')
                    } else if (status != 0) {
                        error("ZAP Frontend: error de ejecucion (${status})")
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'zap-reports/**', allowEmptyArchive: true
                }
            }
        }

        stage('Security Headers - CSP') {
            when { branch 'qa' }
            agent {
                docker {
                    image 'node:24-alpine'
                    reuseNode true
                }
            }
            environment {
                CSP_TARGET_URL = 'https://qa-bomberos.ingsoftware.lat'
            }
            steps {
                sh """
                    mkdir -p zap-reports

                    node - <<'EOF_CSP'
        const fs = require('node:fs');

        async function verificarCSP() {
            const resultado = {
                url: process.env.CSP_TARGET_URL,
                fecha: new Date().toISOString(),
                estado: 'FAIL',
                validaciones: []
            };

            try {
                const response = await fetch(resultado.url, {
                    signal: AbortSignal.timeout(15000)
                });

                const csp = response.headers.get('content-security-policy');

                const checks = {
                    'Respuesta HTTP correcta': response.ok,
                    'Cabecera CSP presente': Boolean(csp),
                    'Directiva default-src': /(?:^|;)\\s*default-src\\s+/i.test(csp || ''),
                    'Directiva script-src': /(?:^|;)\\s*script-src\\s+/i.test(csp || '')
                };

                resultado.validaciones = Object.entries(checks)
                    .map(([nombre, cumple]) => ({ nombre, cumple }));

                resultado.estado = Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL';

            } catch (error) {
                resultado.error = error.message;
            }

            fs.writeFileSync('zap-reports/csp-validation.json', JSON.stringify(resultado, null, 2));
            console.log(JSON.stringify(resultado, null, 2));

            if (resultado.estado !== 'PASS') {
                process.exitCode = 1;
            }
        }

        verificarCSP();
        EOF_CSP
                """.stripIndent()
            }
            post {
                always {
                    archiveArtifacts artifacts: 'zap-reports/csp-validation.json', allowEmptyArchive: true
                }
            }
        }

        stage('Deploy UAT (Docker Compose)') {
            when {
                branch 'uat'
            }
            steps {
                withCredentials([file(credentialsId: 'BOMBEROS_FRONTEND_UAT', variable: 'SECRET_FILE')]) {
                    withEnv(['COMPOSE_PROJECT=bomberos-frontend-uat']) {
                        sh '''
                            set -eu
                            rm -f .env
                            cp "$SECRET_FILE" .env
                            docker compose -p "$COMPOSE_PROJECT" -f docker-compose.uat.yml down
                            docker compose -p "$COMPOSE_PROJECT" -f docker-compose.uat.yml up -d --build
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            deleteDir()
        }
    }
}