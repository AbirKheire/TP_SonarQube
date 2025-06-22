| Fichier               | Ligne | Type de problème | Description                                                                 | Action à réaliser                                |
|----------------------|-------|------------------|-----------------------------------------------------------------------------|--------------------------------------------------|
| auth.controller.js   | 12    | Code smell       | La fonction `getAgeFromBirthdate` pourrait être déplacée dans un fichier utils.js | Externaliser la fonction en créant un fichier `utils.js` |
| auth.controller.js   | 21    | Code smell       | Fonction `register` très longue et dense                                   | Découper la logique en sous-fonctions            |
| auth.controller.js   | 23    | Sécurité         | Pas de validation des inputs (email, password…) avant d'utiliser           | Ajouter une validation (Joi, Regex)              |
| auth.controller.js   | 25    | Sécurité         | Requête SQL construite avec des paramètres mais sans validation d'entrée   | Valider les entrées et gérer les injections      |
| auth.controller.js   | 50    | Code smell       | `createUser` est une fonction peu lisible (fonction dans une fonction)     | Découper la logique de la fonction en plusieurs sous-fonctions |
| auth.controller.js   | 79    | Code smell       | Fonction `login` trop dense                                                 | Séparer la logique en fonctions distinctes       |
| auth.controller.js   | 81    | Sécurité         | Pas de validation d'email ou mot de passe                                  | Ajouter un schéma de validation (Joi ou Regex)   |
| users.controller.js  | 19    | Sécurité         | Le mot de passe est bien hashé mais aucune validation dans `auth.controller.js` | Reprendre la regex de validation ici aussi       |
| users.controller.js  | 26    | Code smell       | Manque d’une méthode de try/catch sur les `db.query`                        | Ajouter une gestion d'erreurs uniforme pour faciliter le débogage |
| permissions.controller.js | 9 | Code smell       | Pas de validation des inputs dans `createPermission`                        | Valider les données avant insertion              |
