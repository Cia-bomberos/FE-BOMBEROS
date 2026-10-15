pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '5'))
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
            sh 'rm -f .env'
        }
    }
}