# Un JRE et Node. Rien d'autre — ni Python, ni PyTorch, ni GPU, ni modèle à
# télécharger. C'est ce qui permet à ce conteneur de démarrer à froid en
# quelques secondes, et donc de tenir sur un hébergement gratuit.
FROM eclipse-temurin:21-jre-jammy

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates gnupg \
 && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

# **Un utilisateur ordinaire, et son foyer.** Les hébergeurs gratuits lancent le
# conteneur sous l'identifiant 1000 : sans ce compte, Java et npm chercheraient
# un dossier personnel qui n'existe pas, et échoueraient pour une raison
# introuvable dans les journaux.
RUN useradd --create-home --uid 1000 utilisateur
ENV HOME=/home/utilisateur

WORKDIR /app

# Les dépendances d'abord : elles changent moins souvent que le serveur, et
# cette couche se garde en cache d'une construction à l'autre.
COPY --chown=1000:1000 package.json ./
RUN npm install --omit=dev

COPY --chown=1000:1000 serveur.mjs ./

RUN chown -R 1000:1000 /app

USER 1000

# 8080 partout. Un Space Hugging Face le déclare dans `app_port`, les autres
# hébergeurs lisent `EXPOSE` ou la variable `PORT`.
ENV PORT=8080
EXPOSE 8080

# Le service n'authentifie personne par lui-même : c'est `JETON_PARTAGE` qui
# tient sa porte, et la fonction Supabase qui sait *qui* appelle. Sans jeton, il
# accepte tout le monde — et il le crie au démarrage.
CMD ["node", "serveur.mjs"]
