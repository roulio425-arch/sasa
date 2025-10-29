# 🎵 Configuration ZG Music Bot

## ⚠️ IMPORTANT - Configuration sans fichier .env

Ce bot est configuré pour fonctionner **SANS fichier .env**. Toutes les valeurs sont directement dans les fichiers de configuration.

---

## 📝 Étapes de configuration

### 1️⃣ Ouvrez le fichier `config.js`

### 2️⃣ Remplacez les valeurs suivantes :

#### **Discord Bot**
```javascript
client_token: "VOTRE_TOKEN_DISCORD_ICI",
client_id: "VOTRE_CLIENT_ID_ICI",
```
- Obtenez ces valeurs sur : https://discord.com/developers/applications

#### **MongoDB**
```javascript
mongodb_url: "VOTRE_MONGODB_URL_ICI",
```
- Format exemple : `mongodb+srv://username:password@cluster.mongodb.net/database`
- Obtenez une base de données gratuite sur : https://www.mongodb.com/cloud/atlas

#### **Spotify API**
```javascript
spotify: {
    ClientId: "VOTRE_SPOTIFY_CLIENT_ID_ICI",
    ClientSecret: "VOTRE_SPOTIFY_CLIENT_SECRET_ICI",
}
```
- Créez une application sur : https://developer.spotify.com/dashboard
- Ajoutez `http://localhost:5000/callback` dans les Redirect URIs

#### **Dashboard Token (Optionnel)**
```javascript
dashboard_token: "demo_token_2024",
```
- Ce token est utilisé pour sécuriser l'accès au dashboard web
- Vous pouvez le changer pour un token personnalisé

---

## 🌐 URLs Configurées

Le dashboard est compatible avec les URLs suivantes :
- ✅ `http://localhost:5000`
- ✅ `http://217.160.125.126:14323`
- ✅ `https://wispbyte.com`
- ✅ Domaine Replit (automatique)

---

## 🔐 Page de Connexion

Le dashboard est protégé par un code d'accès :

**Code d'accès** : `haroldetkumar`

Pour changer ce code, modifiez la ligne dans `web/public/index.html` :
```javascript
const CORRECT_CODE = "haroldetkumar";
```

---

## 🚀 Démarrage

1. **Installer les dépendances** :
```bash
npm install
```

2. **Démarrer le bot** :
```bash
node Aria.js
```

3. **Accéder au dashboard** :
- Ouvrez votre navigateur sur `http://localhost:5000`
- Ou sur l'une des URLs configurées
- Entrez le code : `haroldetkumar`

---

## 📊 Fonctionnalités

### Bot Discord
- ✅ Lecture de musique depuis YouTube, Spotify, SoundCloud
- ✅ File d'attente avec drag & drop
- ✅ Contrôles vocaux avancés
- ✅ Déconnexion automatique après 15 minutes d'inactivité

### Dashboard Web
- ✅ Interface moderne avec thème rouge/bleu
- ✅ Page de connexion sécurisée
- ✅ Sélection de serveur Discord
- ✅ Contrôles en temps réel
- ✅ Recherche multi-plateforme
- ✅ Top 20 France intégré

---

## 🛠️ Support

Pour toute question ou problème :
1. Vérifiez que toutes les valeurs dans `config.js` sont correctement remplies
2. Vérifiez les logs dans la console
3. Assurez-vous que MongoDB est bien connecté

---

## ⚠️ Sécurité

**NE PARTAGEZ JAMAIS** votre fichier `config.js` car il contient vos tokens et clés API !

Si vous devez partager votre code :
1. Créez un fichier `config.example.js` avec des valeurs factices
2. Ajoutez `config.js` dans votre `.gitignore`

---

🎵 **Bon streaming musical !** 🎵
