@REM Maven Wrapper Script for Windows
@echo off
set MAVEN_WRAPPER_JAR=.mvn\wrapper\maven-wrapper.jar
set MAVEN_WRAPPER_PROPERTIES=.mvn\wrapper\maven-wrapper.properties

if exist %MAVEN_WRAPPER_JAR% (
    java -jar %MAVEN_WRAPPER_JAR% %*
) else (
    mvn %*
)
