# Stage 1: Build Native Binary using GraalVM JDK 21
FROM ghcr.io/graalvm/native-image-community:21 AS build
WORKDIR /app

# Install Maven
RUN microdnf install -y maven && microdnf clean all

# Cache Maven dependencies
COPY pom.xml .
RUN mvn -B dependency:go-offline

# Copy source code and compile Native Image
COPY src ./src
RUN mvn -B clean -Pnative -DskipTests native:compile

# Stage 2: Ultra-lightweight runtime image
FROM ubuntu:24.04
WORKDIR /app

# Non-root user (UID 1000)
RUN (id -u 1000 >/dev/null 2>&1 || useradd -m -u 1000 appuser) \
    && chown -R 1000:1000 /app

COPY --from=build --chown=1000:1000 /app/target/ynabx-backend app

USER 1000

ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 10000

ENTRYPOINT ["./app"]
