# Etapa de compilación
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Etapa de ejecución
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar backend.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","backend.jar"]