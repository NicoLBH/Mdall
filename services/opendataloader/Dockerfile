# Un JRE et Node. Rien d'autre — ni Python, ni PyTorch, ni GPU, ni modèle à
# télécharger. C'est ce qui permet à ce conteneur de démarrer à froid en une
# seconde, et donc de dormir entre deux comptes rendus.
FROM eclipse-temurin:21-jre-jammy

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Les dépendances d'abord : elles changent moins souvent que le serveur, et
# cette couche se garde en cache d'une construction à l'autre.
COPY package.json ./
RUN npm install --omit=dev

COPY serveur.mjs ./

ENV PORT=8080
EXPOSE 8080

# Le service n'authentifie personne : la porte est tenue par la fonction
# Supabase qui l'appelle. Ne l'exposez pas sur l'internet public.
CMD ["node", "serveur.mjs"]
