# Stage 1: Build Spring Boot executable JAR
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cache Maven dependencies before copying source code
COPY pom.xml .
RUN mvn -B dependency:go-offline

# Copy source code and package executable fat JAR
COPY src ./src
RUN mvn -B clean package -DskipTests

# Stage 2: Memory-tuned JVM 21 runtime for Render Free Tier (512MB RAM)
FROM eclipse-temurin:21-jre
WORKDIR /app

# Create/use non-root user (UID 1000)
RUN (id -u 1000 >/dev/null 2>&1 || useradd -m -u 1000 appuser) \
    && chown -R 1000:1000 /app

COPY --from=build --chown=1000:1000 /app/target/*.jar app.jar

USER 1000

# Memory tuning for 512MB container (~180-220MB total RSS):
# - UseSerialGC: minimal GC memory overhead for small containers
# - TieredStopAtLevel=1: disables C2 JIT compiler to save ~60-80MB native memory & speed up startup
# - Xmx220m + MaxMetaspaceSize=96m: strict cap well below Render's 512MB limit
ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -Xms64m -Xmx220m -XX:MaxMetaspaceSize=96m -XX:ReservedCodeCacheSize=32m -Xss512k -XX:+UseSerialGC -XX:+TieredCompilation -XX:TieredStopAtLevel=1 -XX:+ExitOnOutOfMemoryError"

EXPOSE 10000

ENTRYPOINT ["java", "-jar", "app.jar"]
