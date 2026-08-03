# Stage 1: Build the application using Maven
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

# Copy the pom.xml and download dependencies
# This step is cached as long as pom.xml doesn't change
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy the source code and build the application
COPY src src
RUN mvn package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the built JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose the application port defined in application.properties
EXPOSE 8081

# Run the jar
ENTRYPOINT ["java", "-jar", "app.jar"]
