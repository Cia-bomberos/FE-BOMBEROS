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
                    args '-v fe-bomberos-npm-cache:/root/.npm -v fe-bomberos-node-modules:/app/node_modules'
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
                    image 'mcr.microsoft.com/playwright:v1.48.0-jammy'
                    reuseNode true
                }
            }
            environment {
                PLAYWRIGHT_BASE_URL = 'https://qa-bomberos.ingsoftware.lat'
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'BOMBEROS_E2E_QA',
                    usernameVariable: 'E2E_USER',
                    passwordVariable: 'E2E_PASS'
                )]) {
                    sh '''
                        npm ci --prefer-offline --no-audit
                        npx playwright test --reporter=list
                    '''
                }
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

                            ESTADO=0
                            docker exec "$NOMBRE" zap-full-scan.py \
                                -t https://qa-bomberos.ingsoftware.lat \
                                -j \
                                --client-spider \
                                -m 5 \
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
                sh '''
                    mkdir -p zap-reports

                    node <<'NODE'
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
        NODE
                '''
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