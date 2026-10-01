# BAAM.Lab

Premier portail territorial construit avec le kit de registre BAAM.

## Chaîne

```text
R-Time Simulator/baam.json ───────┐
pixel-bloom/baam.json ────────────┼──→ scripts/build-portal.js
suite-premiere-visualizer/baam.json┘          ├──→ public/data/registry.json
                                              ├──→ public/data/graph.jsonld
                                              └──→ public/sitemap.xml
```

`portal.config.json` contient la définition du territoire et la liste explicite des
sources autorisées. En local, le compilateur lit directement les manifests des dépôts.
Il en conserve une copie dans `data/manifests/`, utilisée comme dernier état valide
quand les dépôts voisins ne sont pas disponibles, notamment lors d'un build autonome.

Une source peut aussi déclarer une URL distante, idéalement
`/.well-known/baam.json`. Le compilateur essaie dans l'ordre : fichier local, URL
distante, puis cache versionné. Les registres JSON restent publiquement accessibles à
BAAM.pro et aux robots, mais ne sont pas présentés comme des actions aux visiteurs.

## Commandes

```text
npm run check
npm run build
npm run serve
```

Le serveur local utilise le port 8089. Le front est statique et le déploiement Netlify
exécute le compilateur avant de publier `public/`.

## Publication

Le dépôt peut être importé directement dans Netlify :

- commande de build : `npm run build` ;
- dossier publié : `public` ;
- domaine public : `lab.baam.pro`.

Les caches sous `data/manifests/` permettent le premier déploiement même avant la
publication distante des manifests de chaque projet.

Cette structure constitue le kit de référence pour Games, Tools et Médias : chaque
portail reste autonome mais partage le même contrat de manifest et d'export.
