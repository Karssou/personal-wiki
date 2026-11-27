
**Prénom** : Alexandre
**Nom** : LARUE
**Code** : alarue


| Élément                                  | Mes noms à moi                              |
| ---------------------------------------- | ------------------------------------------- |
| Dossier de travail sur le PC             | `b1-cyber-alaxandre`                        |
| Nom réseau de Debian (`hostname`)        | `b1-alarue`                                 |
| Nom de la VM dans VirtualBox (`vb.name`) | `b1-alarue`                                 |
| Compte Linux personnel                   | `admin-alarue`                              |
| Fichier de clé SSH sur le PC             | `id_ed25519_b1_cyber-alexandre`             |
| Nom du site local                        | `b1-alarue.test`                            |
| Racine des fichiers web                  | `/var/www/b1-alarue/public`                 |
| VirtualHost HTTP                         | `b1-alarue.conf`                            |
| VirtualHost HTTPS                        | `b1-alarue-ssl.conf`                        |
| Noms des journaux dédiés                 | `b1-alarue-…log`                            |
| Certificat et clé TLS                    | `b1-alarue.test.crt` / `b1-alarue.test.key` |
| Base MariaDB                             | `wp_alarue`                                 |
| Compte MariaDB local                     | `wp_alarue@localhost`                       |
| Comptes WordPress                        | `b1-alexandre`, `ecriteur`                  |
| Titre du site et article témoin          | Un titre fictif un peu débile               |


## 00 - De la cybersécurité au serveur web

### Explication du schéma et tableau des rôles

1 - Le PC Hôte initie une connexion avec le protocole SSH sur le port 2222 de son pc qui va être redirigé sur le port 22 pour pouvoir accéder à la VM. Pour une consultation, ce n'est pas la même puisque l'on utilise le protocole HTTPS sur le port 443 pour afficher la page. Pour autant, sur le PC Hôte, on va contacter le port 8443 et VirtualBox va nous rediriger vers le port 443 de la VM. La ligne qui permet d'administrer la machine est celle du protocole SSH parce que c'est elle seule qui nous permet d'accéder aux fichiers du serveur.
En l'occurrence, le serveur de gestion de base de données (MariaDB) n'a pas de port exposé parce qu'on l'utilise en local donc aucune utilité de l'exposé. Surtout que c'est DANGEREUX.

### Matrice des flux

Je vais me concentrer sur une application web de gestions des adhérents / licencié d'une association sportive.

| SOURCE                                    | DESTINATION                                  | SERVICE                        | BESOIN                                          | DECISION                                                             |
| ----------------------------------------- | -------------------------------------------- | ------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------- |
| PC HÔTE                                   | VM                                           | SSH, TCP : PC 2222 -> VM 22    | Administrer le site                             | Autoriser au sein du labo                                            |
| PC HÔTE                                   | VM                                           | HTTP, TCP : PC 8080 -> VM 80   | Découverte puis redirection                     | Autoriser                                                            |
| PC HÔTE                                   | VM                                           | HTTPS, TCP : PC 8443 -> VM 443 | Utilisation du site                             | Autoriser                                                            |
| PC HÔTE                                   | Dépôts de l'OS, Wordpress                    | HTTPS, DNS, Trafic nécessaire  | Mises à jours, téléchargements                  | Autoriser les sorties pour pouvoir installer les dépendances ect.... |
| Site Web (Wordpress, Serveur node ect...) | Base de données (MariaDB, MySQL, PostgreSQL) | Socket Unix                    | Lire, supprimer, modifier les données de la BDD | Autoriser uniquement pour le site                                    |


## 01 - Construire le laboratoire Vagrant

### A - Construire la machine virtuelle

Le fichier Vagrant : 

![[vagrant-vm-code.png]]

>[!warning]
>Je dois préciser l'architecture ou alors mon Vagrant ne trouve pas mon VirtualBox.

1 - Vérification de la syntaxe `Vagrantfile` via la commande :

```sh
vagrant validate
```

2 - Vérification des ports redirigés de la machine virtuelle : 

```sh
vagrant port
```

C'est actuellement bon parce que la commande retourne : 

```sh
80 (guest) => 8080 (host)
443 (guest) => 8443 (host)
22 (guest) => 2222 (host)
```

Tout les ports (HTTP, HTTPS, SSH) sont redirigés (c'est ok)

>[!notes] Différence Guest et Host
>Le guest est la machine virtuelle et le host est le PC hôte

3 - Lancement de la VM avec cette commande en précisant le provider :

```sh
vagrant up --provider=virtualbox	
```

4 - Vérification que la **machine virtuelle** est conforme : 

```sh
hostnamectl
cat /etc/os-release
uname -m
ip -br address
ip route
free -h
df -h /
```

Résultat : 

![[machine-info-vm.png]]

### B - Configuration du DNS 

Pour ne pas à avoir à taper `127.0.0.1` partout, on peut configurer un DNS en local pour contacter la **machine virtuelle** plus rapidement. Ajout de cette ligne dans le fichier `hosts` de Windows se trouvant dans le répertoire : `C:\Windows\System32\drivers\etc\hosts`

Ajout de cette ligne :

```text
127.0.0.1 b1-alarue.test
```


## 02 - Premiers pas avec Debian

### Créer le petit coin d'entraînement 

Créer un dossier `entraînement`, le sous dossier `journaux` et rentrer dedans avec la commande :

```sh
mkdir -p ~/entrainement/journaux && cd ~/entrainement
```

On peut ainsi faire la commande `pwd` qui nous retourne : 

![[capture-pwd-02.png]]

### Créer un fichier notes et mettre du texte dedans

On peut executer cette commande pour créer un fichier `notes.txt` dans `vagrant/entrainement/journaux` et y insérer du texte : 

```sh
printf "Je suis Alexandre Motherfucker\n" > notes.txt
```

On peut le copier avec la commande `cp` (copy) et le renommer : 

```sh
cp notes.txt copie.txt
```

Et on peut le renommer avec la commande `mv` (move) : 

```sh
mv notes.txt archive.txt
```


>[!notes] Différence > et >>
>Le > en bash signifie que l'on remplace le texte déjà présent par le nouveau texte. Le >> sert à ajouter à la fin du fichier

Exemple : 

![[Capture d'écran 2026-11-18 231722.png]]

Ici j'ai ajouté "deuxieme ligne" dans `archive.txt`


### Créer un compte utilisateur pour administrer la VM

Pour un créer un utilisateur on fait : 

```sh
sudo adduser <nom_du_user>
```

Ensuite on doit l'autoriser à administrer (donc avoir sudo) :

```sh
sudo usermod -aG sudo admin-alarue
```

>[!notes] Arguments de la commande
>- `usermod` modifie un compte existant ;
>- `-G sudo` indique le groupe supplémentaire auquel on veut le rattacher ;
>- `-a` demande de **l’ajouter** sans retirer ses autres groupes supplémentaires ;
>- `webadmin` est le compte concerné.

La commande `id` permet d'afficher l'appartenance du compte, ici elle nous retourne : 

```sh 
uid=1001(webadmin) gid=1001(webadmin) groups=1001(webadmin),27(sudo),100(users)
```

On peut voir qui on est avec la commande `whoami`


### Les droits sur les fichiers et dossiers 

Comment les reconnaitre : 

```text
-  rw-  r--  ---
│   │    │    └── les autres utilisateurs
│   │    └─────── les membres du groupe du fichier
│   └──────────── le propriétaire du fichier
└──────────────── le type
```
Le premier caractère vaut ici `-`, donc c’est un fichier ordinaire. `d` indique un dossier

Ensuite, chaque catégorie a trois emplacements : `r`, `w`, `x`. Un tiret à une place signifie que ce droit n’est pas accordé à cette catégorie.

| Droit         | Sur un fichier                                                   | Sur un dossier                                                                                          |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `r` — read    | Lire son contenu                                                 | Lister les noms qu’il contient                                                                          |
| `w` — write   | Modifier son contenu                                             | Modifier ses entrées, par exemple créer ou retirer un fichier, avec les droits de traversée nécessaires |
| `x` — execute | Autoriser son exécution comme programme, si son format le permet | Traverser le dossier, accéder à un nom situé dedans                                                     |

On peut écrire ces droits avec des nombres. Pour chaque catégorie :

| Droit | Valeur |
| ----- | -----: |
| `r`   |      4 |
| `w`   |      2 |
| `x`   |      1 |
| Aucun |      0 |

On additionne les droits présents : `rw-` donne `4 + 2 = 6`, `r-x` donne `4 + 1 = 5`, `rwx` donne `7`.
Exemple le droit `600` donne le droit d'écriture et de lecture à son créateur mais pas de le traverser  

>[!notes]
>Les droits c'est compliqué : /

### Management des paquets

Pour mettre à jour les paquets, on va faire 2 commandes :

- `sudo apt update` => Met à jour les informations des dépôts (là où on récupère nos fichiers)
- `sudo apt upgrade` => Met à jour les paquets grâce aux nouvelles informations de dépôts.

Ensuite on peut installer toutes les dépendances

```sh
sudo apt install ca-certificates curl openssl nano less man-db iproute2 dnsutils netcat-openbsd
```

### Comment regarder la mémoire de la VM

Avec la commande `free -h` on peut voir l'espace mémoire et swap utilisé et l'espace restant

Ensuite avec la commande `df -h` on peut voir le stockage restant sur le disque.

### Comment on regarde ce qui tourne sur le pc 

La commande `ps aux` qui retourne la liste des processus en cours avec le user, le PID ect....

### Observer les connections réseaux 

La commande `ss` permet d'observer les points de communication réseaux

>[!notes] Les arguments de la commande SS
>- `-l` : les points en écoute, qui attendent des connexions ;
>- `-n` : adresses et ports sous forme numérique ;
>- `-t` : le transport utilisé;
>- `-p` : les informations sur les processus associés, quand les droits permettent de les voir.


### Faire un diagnostic réseau 

Le premier point à regarder si un service (comme SSH) ne fonctionne pas mais qu'il est bien installé sur le PC il faut regarder le journal pour voir si le service tourne avec `systemctl status ssh`. Si le **status** est `active` alors cela vient du réseau. Soit la connection réseau n'est pas établi



## 03 - SSH et clés personnelles

On va passer sur le compte `admin-alarue` créer précédemment pour administrer le serveur. Nous voudrions pouvoir nous y connecter en SSH.

On vérifie que le dossier `.ssh` qui contient `authorized_keys` existe ! 
On va taper cette commande pour à la fois créer et mettre les droits sur le dossier `.ssh` dans le répertoire de `admin-alarue`

```sh
sudo install -d -o admin-alarue -g admin-alarue -m 700 /home/admin-alarue/.ssh
```

>[!notes] Arguments de la commande ci-dessus
>`install`
>
>Utilitaire permettant notamment de créer des répertoires et de définir leurs permissions.
>
>`-d`
>
>Indique qu'on souhaite créer un répertoire (_directory_).
>
>`-o admin-alarue`
>
>Définit `admin-alarue` comme propriétaire du répertoire.
>
>`-g admin-alarue`
>
>Définit `admin-alarue` comme groupe propriétaire.
>
>`-m 700`
>
>Définit les permissions Unix du répertoire.
>
>`/home/admin-alarue/.ssh`
>
>Chemin du répertoire à créer.

On ajoute la clé générée du côte du PC Hôte : 

```sh
sudoedit /home/admin-alarue/.ssh/authorized_keys
```

Et on ajoute les droits pour mon user `admin-alarue` :

```sh
sudo chown admin-alarue:admin-alarue /home/admin-alarue/.ssh/authorized_keys
sudo chmod 600 /home/admin-alarue/.ssh/authorized_keys
```

Maintenant on peut se connecter avec la commande dans le `PC Hôte` : 


```sh
ssh -p 2222 -i ~/.ssh/id_ed25519_b1_cyber-alexandre -o IdentitiesOnly=yes admin-alarue@127.0.0.1
```

>[!warning] Pourquoi pas juste `ssh admin-alarue@127.0.0.1 -p 2222`
>Si on fait ça on nous demanderas le MDP, or on veut utiliser notre paire de clé SSH ! 
>Enfaite vu qu'on a renommé notre fichier de clé ssh, il va le skip directement. Donc on spécifie le fichier et on l'interdit de tenter d'utiliser tout autre fichier de clé avec `-o IdentitiesOnly=yes`.
>


On peut voir que je suis bien connecté :

![[preuve-compte-admin.png]]



## 04 - HTTP et Apache2

On peut installer curl si ce n'est pas déjà fait : 

`sudo apt install curl` : ça nous permettras de pouvoir contacter des serveurs web en ligne de commande 

Maintenant on installe `apache2` pour faire notre serveur web et pouvoir avoir notre super serveur web avec `sudo apt install apache2`

Puis on peut l'activer (parce que apparemment il n'est pas activé) avec `sudo systemctl enable apache2 --now`

Et on doit voir : ![[status-apache2.png]]

_Désolé pour le terminal transparent_  


On peut maintenant vérifier si la config de apache2 est bonne avec `sudo apache2ctl configtest` ici on peut voir que le nom de ServerName n'est pas configuré pour l'instant donc c'est normal.

![[configtest-apache2.png]]

Avec la commande `sudo ss -lntp` on peut voir que le port 80 est écouté par **apache2**  : 

![[Pasted image 20261119150513.png]]

On peut ainsi déterminer que un `curl -I http://127.0.0.1/` retourne un **HTTP 200 OK** :

![[Pasted image 20261119145829.png]]

### Accéder à la page web de notre apache2

Etant donné que `Apache2` est lancé ! Et que l'on voit que la commande `curl` marche, on peut totalement regarder notre page de puis notre navigateur en allant sur `http://b1-alarue.test:8080` qui nous retourne cette page  :

![[Pasted image 20261119150542.png]]

### Mettre notre propre page HTML / PHP 

Tout d'abord, il faut créer le répertoire dans lequel les fichiers du site vont être déposés !

Pour cela il faut donc créer le fichier correspondant :
```sh
sudo install -d -o admin-alarue -g www-data -m 2750 /var/www/b1-alarue/public
```

On va créer un petit fichier html personnalisé : 

```html
<!doctype html>
<html lang="fr"><
meta charset="utf-8">
<title>Le giga site d'Alexandre</title>
<h1>Le serveur alexandre : serveur de laboratoire</h1>
</html>
```


Ensuite on créer notre fichier `b1-alarue.conf` dans `/etc/apache2/sites-available`

Et je me le contenu ci-dessous : 

```apache
<VirtualHost *:80>
    ServerName b1-alarue.test
    DocumentRoot /var/www/b1-alarue/public
    DirectoryIndex index.html index.php

    <Directory /var/www/b1-alarue/public>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/b1-alarue-error.log
    CustomLog ${APACHE_LOG_DIR}/b1-alarue-access.log combined
</VirtualHost>
```

Il faut ensuite l'activer ! Pourquoi ? Parce qu'il est dans `sites-available` mais pour autant apache2 ne le considère pas comme serviable. On doit le mettre dans `sites-enabled` grâce à l'outil `a2ensite` pour le transférer tel que : 

```sh
sudo a2ensite b1-alarue.conf
```

On doit aussi décharger le fichier de config par défaut avec la commande : 

```sh
sudo a2dissite 000-default.conf
```

Et reload `apache2` :

```sh
sudo systemctl reload apache2
```


Et on peut voir que ça marche avec la commande `sudo apache2ctl -S` : 

![[Pasted image 20261119163605.png]]

![[Pasted image 20261119162636.png]]



### Sécuriser notre Apache2

On créer le fichier `/etc/apache2/conf-available/b1-security.conf` contenant ceci : 

```apache
ServerTokens Prod
ServerSignature Off
TraceEnable Off
```

>[!notes] A quoi ça sert ?
> - `TraceEnable` contrôle la gestion des requêtes HTTP de type **`TRACE`** (==méthode de diagnostic qui renvoie la requête reçue au client==)
> - `ServerSignature` supprime certaines informations sur la version d'apache2. Evitant ainsi de se faire viser par certaines attaques visant des versions spécifiques d'apache2.
> - `ServerTokens Prod` permet d'afficher seulement le serveur apache en en-tête sans afficher l'OS ou les modules installés

>[!warning] Attention à la config de sécurité
>Dans notre exemple le nom du fichier de config commence par un "b".
>Or `Apache2` les charges par ordre alphabétique, ce qui signifie que si un fichier commence par un "s" (par exemple) et bien il écrasera les paramètres de notre fichier `b1-security-conf`.
>Donc il faut penser à désactivé le fichier `security-conf` via la commande ou juste a changé le nom :
>```sh
>sudo a2disconf security
>```  


## 05 - PHP avec Apache et MariaDB

### Installer PHP dans Apache

#### Pourquoi prefork ? Et event, alors ?

Un **MPM** (_Multi-Processing Module_) définit la manière dont Apache répartit le travail. Un **processus** est une instance de programme gérée par le système ; un **thread** est un fil d’exécution à l’intérieur d’un processus.

|Mode|Organisation simplifiée|Conséquence pour notre parcours|
|---|---|---|
|`prefork`|Plusieurs processus, un seul fil de traitement par processus ; chacun sert une connexion à la fois|Compatible avec le module PHP Debian ; PHP est chargé dans les processus Apache|
|`event`|Des processus avec plusieurs threads ; les connexions persistantes en attente peuvent être gérées sans immobiliser un thread de traitement|Plus adapté à de nombreuses connexions en attente ; le module PHP Debian ne s’y charge pas|

#### Regarder les modules de Apache2

On peut regarder les modules disponible avec la commande `sudo apache2ctl -M` .
Et on peut notamment voir `mpm_event_module (shared)` .


#### Installer les composants PHP 

On va faire cette commande qui installe les différents modules PHP : 

```sh
sudo apt install libapache2-mod-php8.4 php8.4-cli php8.4-mysql php8.4-curl php8.4-gd php8.4-mbstring php8.4-xml php8.4-zip php8.4-intl
```

Ensuite on va désactiver `mpm_event` et activer `mpm_prefork` (comme ce que l'on avait dit avant) : 

```sh
sudo a2dismod mpm_event
sudo a2enmod mpm_prefork php8.4
```

On peut ensuite mettre en place ce changement en vérifiant la config et relancer Apache2 : 

```sh
sudo apache2ctl configtest
sudo systemctl restart apache2
```

On peut revérifier les modules avec `sh sudo apache2ctl -M` et l'on peut voir que `mpm_event_module` n'est plus là et s'est transformé en `mpm_prefork_event`.

Preuve : 

![[Pasted image 20261119193221.png|311]]

Enfin, on peut vérifier que php est installé en lançant `php -v` .

#### Vérifier que Apache peut utiliser PHP

Rien ne dit que notre Apache peut utiliser PHP même si il est installé ! 

Donc on va créer une sonde `sonde-b1-alarue.php` dans `var/www/b1-alarue/public` contenant ceci : 

```php

<?php header("Content-Type: text/plain; charset=utf-8"); 
echo "PHP exécuté\n";
echo "Moteur web : ", PHP_SAPI, "\n"; 
echo "Configuration : ", php_ini_loaded_file()
```

Et on curl le fichier pour voir si Apache lit bien le PHP :

![[Pasted image 20261119193819.png]]

On peut enlever la sonde maintenant : `rm /var/www/b1-alarue/public/sonde-b1-alarue.php`

### La base de données MariaDB

#### Installation de la base de données 

D'abord, on récupère les paquets de MariaDB : 

```sh
sudo apt install mariadb-server
```

Puis on l'active : 

```sh
sudo systemctl enable --now mariadb
```

On peut voir que MariaDB écoute bien sur le port `3306` :  

![[Pasted image 20261119194620.png]]

On peut aussi voir la version de MariaDB avec la commande :

```sh
sudo mariadb -e 'SELECT VERSION();'
```

#### Rentrer et utiliser MariaDB

On peut rentrer dans `MariaDB` sous l'utilisateur `root` en lançant : 

```sh
sudo mariadb
```

On peut créer un fichier dans `/etc/mysql/mariadb.conf.d/99-b1-local.cnf` qui va permettre de désactiver l'écoute de mariadb sur le port `3306`: 

```ini
[mariadbd]
skip-networking
```

Après un redémarrage du service mariadb, vérifions qu'il n'écoute plus le port 3306 grâce à 
`ss -lntp` :

![[Pasted image 20261119221304.png]]

#### Créer le premier utilisateur et base de données

Pour créer l'utilisateur, on doit rentrer dans MariaDB. Cependant, on ne veut pas sauvegarder l'historique de commande. Ca serait con qu'on nous hack et qu'on puisse accéder à notre mot de passe de BDD : / .

On exécute la commande suivante : 

```sh
sudo env MYSQL_HISTFILE=/dev/null mariadb
```

Bravo vous êtes sur MariaDB, vous allez voir c'est facile !

Vous devez d'abord faire cette commande : 

```sql
CREATE DATABASE wp_alarue CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Celle-ci va créer la base de données que Wordpress va utiliser.

Ensuite on créer l'utilisateur avec cette commande : 

```sql
CREATE USER 'wp_alarue'@'localhost' IDENTIFIED BY '[SECRET RETIRÉ]';
```

Et on lui attribue les droits sur la database `wp_alarue` uniquement :

```sql
GRANT ALL PRIVILEGES ON wp_alarue.* TO 'wp_alarue'@'localhost';
SHOW GRANTS FOR 'wp_alarue'@'localhost';
```

Ainsi on peut voir que l'on a tout les droits sur la db `wp_alarue` nécessaire au début avec wordpress pour qu'il puisse créer ces tables et tout, ainsi que faires les migrations ect....

Maintenant on peut totalement sortir de mariadb avec l'utilisateur root pour se connecter à MariaDB depuis le Socket UNIX avec l'utilisateur que nous venons de créer :

```sh
mariadb --protocol=SOCKET -u wp_alarue -p wp_alarue
```

Ensuite on peut taper quelques données de tests pour vraiment tester que les droits sont bons 

```sql
SELECT CURRENT_USER();
CREATE TABLE essai_b1 (id INT PRIMARY KEY, message VARCHAR(120) NOT NULL);
INSERT INTO essai_b1 VALUES (1, 'Donnée fictive de contrôle');
SELECT * FROM essai_b1;
SHOW GRANTS;
SELECT User FROM mysql.user;
DROP TABLE essai_b1;
```

>[!warning] Select User doit rater
>La commande SELECT doit rater et c'est voulu ! La limite fonctionne bel et bien comme le montre ce screenshot : 
>
>![[Pasted image 20261119221627.png]]

Donc nous venons de lancer PHP sur le serveur Apache2 et nous nous sommes assurés qu'il tournait bien. Dans le même temps, on a installé `MariaDB` et créer un utilisateur wordpress sur le serveur `MariaDB` tout en nous assurant qu'elle n'était pas accessible de l'extérieur (donc en n'exposant pas le port 3306).

## 06 - HTTPS et certificats

Dans cette partie on va créer une parie de clés autosigné puisque nous sommes sur un nom de domaine local. Ainsi on va utiliser **OpenSSL** et non **Let's Encrypt** .

#### Créer notre certificat HTTPS autosigné

On va d'abord créer un dossier qui va stocker la clé privée de notre certificat. Le seul utilisateur qui aura accès sera le root donc on lui met les droits 7

```sh
sudo install -d -o root -g root -m 700 /etc/ssl/private/b1-alarue
```


Ensuite grâce à `OpenSSL` on va créer notre certificat autosigné et la clé privée :

```sh
sudo openssl req -x509 -newkey rsa:3072 -sha256 -days 90 -nodes \
  -keyout /etc/ssl/private/b1-alarue/b1-alarue.test.key \
  -out /etc/ssl/certs/b1-alarue.test.crt \
  -subj '/CN=b1-alarue.test' \
  -addext 'subjectAltName=DNS:b1-alarue.test' \
  -addext 'basicConstraints=critical,CA:FALSE' \
  -addext 'keyUsage=critical,digitalSignature,keyEncipherment' \
  -addext 'extendedKeyUsage=serverAuth'
```

>[!notes] A quoi servent les différents arguments ?
>`-nodes` : Sert à ne pas chiffrer la clé privée sur le serveur ce qui évite à avoir à taper un mdp à chaque démarrage d'apache.

On attribue maintenant les bon droits à root pour le fichier de la clé privée :

```sh
sudo chmod 600 /etc/ssl/private/b1-alarue/b1-alarue.test.key
```

Enfin, on peut vérifier que tout à fonctionner avec la commande suivante :

```sh
openssl x509 -in /etc/ssl/certs/b1-alarue.test.crt -noout -subject -issuer -dates -fingerprint -sha256
```

Et voici notre certificat créée : 

![[Pasted image 20261119223629.png]]


#### Ajouter le VirtualHost HTTPS


Tout d'abord, on doit activer les modules **SSL** et **headers** dans Apache2 avec la commande :

```sh
sudo a2enmod ssl headers
```

_Ensuite on redémarre Apache2_

Maintenant, on va créer un nouveau fichier de config (comme pour le http) sauf que cette fois on va préciser le **certificat TLS** . 

On peut donc créer un nouveau fichier 

```sh
sudoedit /etc/apache2/sites-available/b1-alarue-ssl.conf
```

Et rentrer ceci : 

```apache
<VirtualHost *:443>
    ServerName b1-alarue.test
    DocumentRoot /var/www/b1-alarue/public
    DirectoryIndex index.php index.html

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/b1-alarue.test.crt
    SSLCertificateKeyFile /etc/ssl/private/b1-alarue/b1-alarue.test.key
    SSLProtocol -all +TLSv1.2 +TLSv1.3

    <Directory /var/www/b1-alarue/public>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted
    </Directory>

    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    ErrorLog ${APACHE_LOG_DIR}/b1-alarue-ssl-error.log
    CustomLog ${APACHE_LOG_DIR}/b1-alarue-ssl-access.log combined
</VirtualHost>
```

On peut voir que c'est sensiblement le même fichier que `b1-alarue.conf` vu précédemment mais cette fois on active le SSL et on joint notre certificat et la clé privée.

Enfin l'on peut mettre notre fichier config en "prod", tester la config, et relancer apache :

```sh
sudo a2ensite atelier-ssl.conf

sudo apache2ctl configtest

sudo systemctl reload apache2
```

Et tadam !!!! Si l'on se rend sur le port 8443 et que l'on bypass la gros avertissement du navigateur on arrive ici :

![[Pasted image 20261119224717.png]]

Cependant, il y a un gros **MAIS**.

Si j'essaie de curl le site en https (`curl https://b1-alarue.test:8443`) j'ai cette erreur : 

![[Pasted image 20261119225059.png]]

Tout simplement parce que `curl` a besoin de faire confiance au certificat ! Et pour cela on va le copier le certificat de notre VM vers notre PC pour pouvoir lui passer en argument et lui dire de ne pas inquiéter ça va bien se passer.

On peut d'abord utiliser `scp` pour copier le fichier du certificat sur le **PC Hôte** :

```sh
scp -P 2222 -i ~/.ssh/id_ed25519_b1_cyber-alexandre admin-alarue@127.0.0.1:/etc/ssl/certs/b1-alarue.test.crt ./b1-alarue.test.crt
```

Ensuite on va refaire le curl mais en lui disant bien d'utiliser CE certificat : 

```sh
curl --cacert ./b1-alarue.test.crt -I https://b1-alarue.test:8443/
```

Et on peut voir que ça marche : 

![[Pasted image 20261119225807.png]]

Le site nous retourne bien un code HTTP 200 OK et `curl` ne retourne pas d'erreur


#### Et les gens qui viennent de HTTP alors ? 

Pour sécuriser l'accès à notre site internet, on doit faire en sorte que tout personnes qui arrive du http, soit notifié que c'est pas possible et qu'on les bouges en HTTPS.

Pour cela il suffit de modifier la configuration de notre fichier `b1-alarue.conf` comme ceci : 

```apache
<VirtualHost *:80>
    ServerName atelier.test
    Redirect permanent / https://atelier.test:8443/
    ErrorLog ${APACHE_LOG_DIR}/atelier-error.log
    CustomLog ${APACHE_LOG_DIR}/atelier-access.log combined
</VirtualHost>
```

_On test et on relance_

Si on test la commande `curl` suivante :

```sh
curl -I http://b1-alarue.test:8080/
```

On nous retourne un code 301 Move Permanently ce qui est normal.

Par contre lorsque l'on lance cette commande :

```sh
curl --cacert ./b1-alarue.test.crt -I -L http://b1-alarue.test:8080/
```

Ca marche parfaitement : 

![[Pasted image 20261119232523.png]]

>[!notes] Explications
>Grâce au flag `-L` on demande à curl de nous rediriger automatiquement si l'on rencontre un code 301.
>Cela n'aurait pas été possible sans mettre le explicitement le certificat dans curl parce qu'on nous aurions été redirigé vers un virtualHost avec un certificat auto-signé auquel `curl` n'a pas confiance 



## 07 - Installer Wordpress 

Pour installer Wordpress, on va utiliser `curl` .

### Télécharger l'archive wordpress et vérifier son intégrité 

D'abord on créer un dossier `telechargement-wp` :

```sh 
mkdir -p ~/telechargement-wp && cd ~/telechargement-wp
```

Ensuite on va télécharger wordpress, non pas par `apt` mais bien par curl avec la commande  suivante : 

```sh
curl --fail --location --proto '=https' --tlsv1.2 https://wordpress.org/latest.tar.gz -o wordpress.tar.gz
```

Pour s'assurer qu'on a tout reçu, on va exécuter une commande pour s'assurer de l'archive que nous avons reçu :

```sh
sha256sum wordpress.tar.gz
```

Ca retourne le hash suivant : 
```
053857d980eaee8702c617c685948becb9be2523ba0dcbc98e4dbb2300367c79  wordpress.tar.gz
```


### Extraire l'archive proprement 

Pour extraire l'archive proprement, on va créer un nouveau dossier `extraction` dans lequel nous allons extraire avec la commande :

```sh
tar -xzf ../wordpress.tar.gz
ls wordpress
```

Nous allons aussi nous assurer que la version installée est la bonne avec la commande : 

```sh
grep '\$wp_version =' wordpress/wp-includes/version.php
```

Elle nous retourne : `$wp_version = '7.1.5';`

### Remplacer notre site statique par Wordpress.

Commençons d'abord par supprimer nos index.html et index.php avec la commande suivante :

```sh
rm /var/www/b1-alarue/public/index.php
```

Et copier le wordpress directement à la place : 

```sh
cp -a wordpress/. /var/www/b1-alarue/public/
```

Nous avons copié le contenu du dossier `wordpress` maintenant nous allons attribuer la propriété  du dossier `var/www/b1-alarue/public` et ses sous dossiers (grâce au flag `-R`) : 

```sh
sudo chown -R admin-alarue:www-data /var/www/b1-alarue/public
```

Ensuite on va appliquer les droits récursivement sur nos dossiers et nos fichiers :

```sh
sudo find /var/www/atelier/public -type d -exec chmod 2750 {} \;
sudo find /var/www/atelier/public -type f -exec chmod 640 {} \;
```

>[!notes] Explication de la commande
>La commande `find` permet de trouver des fichiers / dossiers (selon le flag `-f` ou `-d` ) et d'éxecuter une commande avec `-exec` . Alors maintenant on applique les droits **2750** ou **640** 
>Le `{}` permet de prendre le chemin du fichier ou dossier que l'on a trouvé et donc on le passe en argument à `chmod`.


Maintenant si tout se passe bien nous sommes censé nous retrouver sur **Wordpress** en allant sur `https://b1-alarue.test:8443/` :

![[Pasted image 20261119235406.png]]

### Connecter Wordpress à la BDD MariaDB

On va d'abord aller dans le répertoire du configuration de **Wordpress** , copier le fichier de config par défaut pour créer un nouveau fichier de config et rentrer dedans pour le modifier  :

```sh
cp /var/www/b1-alarue/public/wp-config-sample.php /var/www/b1-alarue/public/wp-config.php
nano /var/www/b1-alarue/public/wp-config.php
```

Ensuite, on peut modifier ces variables dans le fichier avec nos valeurs : 

```php
define('DB_NAME', 'atelierwp');
define('DB_USER', 'wp_app');
define('DB_PASSWORD', 'REMPLACER_PAR_LE_SECRET_DU_TP');
define('DB_HOST', 'localhost');
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');
```

### Configurer Wordpress

Juste avant la dernière ligne du fichier `config.php`, on peut ajouter ceci : 

```php
define('WP_HOME', 'https://b1-alarue.test:8443');
define('WP_SITEURL', 'https://b1-alarue.test:8443');
define('FORCE_SSL_ADMIN', true);
define('DISALLOW_FILE_EDIT', true);
define('DISALLOW_FILE_MODS', true);
```

Ainsi on force le SSL au niveau de la gestion administrateur, on force l'URL du site et la page d'accueil et quelque mods de sécurité.

Maintenant, on va devoir mettre en place les clés et sels de sessions. On pourrait générer oui combinaisons alphanumérique avec **OpenSSL** mais on va passer par le module officiel wordpress : 

```sh
curl --fail --proto '=https' https://api.wordpress.org/secret-key/1.1/salt/ -o "$HOME/sels-wordpress-b1.txt"
```

On va lui demander de nous mettre ça dans le dossier `sels-wordpress-b1.txt`.

Ensuite, on copie simplement le contenu du fichier dans le fichier `config.php`.

On peut alors donner la propriété du fichier config à `root` ainsi que les droits d'écriture et de lecture

```sh
sudo chown root:www-data /var/www/atelier/public/wp-config.php
sudo chmod 640 /var/www/atelier/public/wp-config.php
```

On peut vérifier la syntaxe du fichier, si elle ne retourne aucune erreur c'est ok

```sh
sudo php -l /var/www/atelier/public/wp-config.php
```

On va créer le dossier `content/uploads` et faire quelques tests de droits :

```sh
sudo install -d -o www-data -g www-data -m 750 /var/www/b1-alarue/public/wp-content/uploads
sudo -u www-data test -r /var/www/b1-alarue/public/wp-config.php
sudo -u www-data test -w /var/www/b1-alarue/public/wp-content/uploads
```

Youpi, nous avons un wordpress qui fonctionne : 

![[Pasted image 20261120213537.png]]
_(Le mot de passe à été changé)_ 


### Créer un utilisateur wordpress et un article

Nous venons donc de créer un admin et nous voici sur la page du panel administrateur sur lequel nous pouvons créer des pages, des articles et autres....

![[Pasted image 20261123200731.png]]
_Panel d'administration_


Ensuite nous pouvons créer un petit article dans wordpress : 

Résultat : 

![[Pasted image 20261120214341.png]]
_Page d'accueil avec article_


### Créer un utilisateur éditeur 

On peut maintenant créer un utilisateur avec le rôle d'éditeur pour qu'il puisse écrire des article sans pour autant toucher à des paramètres sensibles (comme la création de comptes).

J'ai donc créer le compte `écriteur` qui peut modifier les articles et autre de mon site `Wordpress`.

![[Pasted image 20261123201337.png]]
_Dashboard de "l'écriteur" avec moins de droits que l'admin_

On peut d'ailleurs écrire un petit article exemple avec une image dedans comme cela : 

![[Pasted image 20261123202559.png]]

Bon du coup tout est bon on peut passer à la suite, si l'on veut on peut voir nos médias dans le dossier `wp-content/uploads`.  Aussi pour voir les articles et les comptes de **WordPress**. Nous devons aller directement dans la base de données.


## 07 - Durcir WordPress 🦾


On veut maintenant pouvoir sécuriser le plus possible notre Wordpress. Notamment pouvoir interdire d'accéder aux fichiers de config via le protocole HTTP ou HTTPS. 

Pour cela on doit donc modifier notre fichier de config **Apache2** pour empêcher l'accès à nos médias dans `wp-content/uploads` ainsi que nos fichiers de config php, nos fichiers de logs, nos fichiers .sql (si on a une bdd en sqlite par exemple). 

Ainsi on doit écrire ceci : 

```apache
# Refuser les fichiers dans wp-config avec l'extension .php et tout les fichiers 
# susceptible 
<FilesMatch "(?i)(^wp-config\.php$|^\.|\.(sql|bak|old|orig|save|log|ini)$)">
    Require all denied
</FilesMatch>

# Refuse l'accès à tout les dossiers caché (.git, .env ect...)
<DirectoryMatch "^/var/www/b1-alarue/public/(.*/)?\.">
    Require all denied
</DirectoryMatch>

# Pose quelques règles de sécurité sur le dossier uploads notamment ne pas pouvoir
# On indexe pas ce dossier, on autorise rien en fallback
<Directory /var/www/b1-alarue/public/wp-content/uploads>
    AllowOverride None
    Options -Indexes
    FallbackResource disabled
    <FilesMatch "(?i)\.(php[0-9]*|phtml|phar)(\.|$)">
        Require all denied
    </FilesMatch>
</Directory>
```

Et donc après avoir vérifier la configuration et reload Apache2 on peut bien voir qu'on nous refuse l'accès : 

![[Pasted image 20261124100128.png]]
_Et ça c'est bien_

### Tester tout cela

On peut exécuter une requête de test comme celle-ci : 

```sh
sudo -u www-data sh -c 'printf "%s\n" "<?php echo \"TEMOIN-B1\";" > /var/www/b1-alarue/public/wp-content/uploads/temoin-b1.php'
```

Celle-ci va tenter de créer un fichier `temoin-b1.php` dans le dossier `uploads` (que nous avons protégé au préalable) mais la création s'effectue bien  :

![[Pasted image 20261124100556.png]]

Maintenant, on va tester si on peut accéder au fichier php que l'on a créer avec un petit curl sur le **PC Hôte** : 

```sh
curl --cacert ./b1-alarue.test.crt -i https://b1-alarue.test:8443/wp-content/uploads/temoin-b1.php
```

Et c'est parfait si ça nous retourne ça : 

![[Pasted image 20261124101646.png]]

On se fait rejeter comme des malpropres et ça c'est bien ! Cela prouve que notre fichier de config Apache2 est pris en compte et fonctionne. 
C'est pareil pour tenter d'accéder au fichier de config `config.php` : 

```sh
curl --cacert ./b1-alarue.test.crt -i https://b1-alarue.test:8443/wp-config.php
```

Résultat : (_encore forbidden_)

![[Pasted image 20261124102543.png]]

## Régler notre PHP

Pour régler notre PHP, on va créer ce fichier _.ini_ qui va nous permettre de régler le comportement du langage PHP en soit. On peut donc créer le fichier dans  `/etc/php/8.4/apache2/conf.d/99-b1-hardening.ini`.

On va mettre le contenu ci-dessous dans le fichier : 

```ini
; On expose pas la version de PHP ou toute information
expose_php = Off
; On explicite de ne pas afficher les erreurs pour ne pas leak des infos 
display_errors = Off
; On affiche pas non plus les erreurs de démarrages 
display_startup_errors = Off
; On active les logs d'erreurs
log_errors = On
; Taille max d'upload de fichier
upload_max_filesize = 8M
; Taille max du body HTTP POST
post_max_size = 10M
; La limite de la RAM (Random Access Memory (actually))
memory_limit = 256M
; Temps d'execution max par code executé ("timeout")
max_execution_time = 60
; On bloque l'accès des cookies au client (Javascript) 
session.cookie_httponly = 1
; On active les cookies de sessions pour qu'ils soient en HTTPS seulement et pas 
; en http 
session.cookie_secure = 1
; On dit qu'il doit être sur notre nom de domaine
session.cookie_samesite = Lax
```

On peut maintenant relancer **Apache2** après avoir vérifier la config : 

```sh
sudo apache2ctl configtest
sudo systemctl restart apache2
```

Cependant, `configtest` ne regarde pas le fichier de propriétés **PHP** que nous avons créer.
Donc nous pouvons regarder le status, les logs et autres.

On peut bien voir qu'il est actif avec la commande : 

```sh
sudo systemctl status apache2
```

On peut d'ailleurs aussi regarder les logs de Apache2 pour être sûr qu'il n'y a aucune erreur : 

```sh
sudo journalctl -u apache2 -n 30 --no-pager
```

### Relevé l'installation actuelle 

Une étape importante d'une installation est de noter la version actuelle de tout nos outils comme le noyau wordpress : 

```sh
grep '\$wp_version =' /var/www/b1-alarue/public/wp-includes/version.php
```

La commande me retourne : `$wp_version = '7.1.5';`

Que l'on peut après mettre dans un petit fichier `WP_Version.txt` avec la date pour que tout le monde puisse y avoir accès et avoir un historique de la version à cette date précise.

On peut aussi voir la version du noyau sur le panel admin dans la section `updates` de **WordPress** .

Plan de mise à jour : 

| Question                                      | Votre réponse                                                                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Qui est responsable ?                         | Le user `admin-alarue` de ma VM Linux.                                                                                       |
| Quel est l’état actuel ?                      | 24-11-2026,  WP Version 7.15, aucune extensions ; état affiché ou interface bloquée par notre politique                      |
| Quand recontrôler ?                           | Une fréquence de consultation des versions et avis de sécurité que vous proposez, ainsi qu’un contrôle avant une maintenance |
| Quoi protéger avant une modification ?        | La base, le site, les médias et la configuration utile ; les sauvegardes contiennent aussi des secrets                       |
| Comment savoir que le site fonctionne après ? | Accueil, connexion, éditeur, article, média, permaliens et refus d’accès du TP                                               |
| Que faire si ça échoue ?                      | Arrêter les changements au hasard et reprendre le point de sauvegarde cohérent, selon une procédure testée                   |

### Tableau de test

| **#** | **Contrôle de sécurité**                       | **Résultat positif (Ce qui passe)**                                                                                                                                                                                     | **Test de refus (Ce qui est bloqué)**                                                                                                                                                                                                                         | **Limite identifiée**                                                                                                                                                  |
| ----- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **HTTPS validé**                               | `curl --cacert ./b1-alarue.test.crt -I [https://b1-alarue.test:8443/](https://b1-alarue.test:8443/)` renvoie `200 OK` avec les en-têtes de sécurité (`nosniff`, `Referrer-Policy`). _(Compléter avec ta sortie exacte)_ | Accès HTTP sur le port 8080 redirigé en `301 Moved Permanently` vers HTTPS ; `curl` sans `--cacert` ou via IP `127.0.0.1` rejeté (`curl: (60)`).                                                                                                              | Certificat auto-signé non reconnu par défaut par les navigateurs tiers sans ajout manuel dans le magasin d'autorités de confiance.                                     |
| **2** | **Configuration non accessible**               | Accès normal aux pages publiques du site WordPress (`200 OK`).                                                                                                                                                          | `curl -I [https://b1-alarue.test:8443/wp-config.php](https://b1-alarue.test:8443/wp-config.php)` (ou accès aux fichiers `.htaccess` / `.git` / sauvegardes) renvoie `403 Forbidden` (ou page blanche `200` sans code source exposé). _(À tester et préciser)_ | Ne protège pas contre une fuite des identifiants si un attaquant obtient un accès en lecture locale (shell) ou via une faille de type _Path Traversal_ dans un plugin. |
| **3** | **Indexation désactivée**                      | Affichage normal d'une page ou d'une image via son URL directe complète.                                                                                                                                                | `curl -I https://b1-alarue.test:8443/wp-content/uploads/`renvoie `403 Forbidden` grâce à `Options -Indexes` (pas de liste des fichiers affichée).                                                                                                             | N'empêche pas le téléchargement direct d'un fichier public si l'attaquant devine ou connaît déjà son nom exact et son chemin.                                          |
| **4** | **PHP refusé dans `uploads`**                  | Upload et affichage d'une image légitime (`.jpg` / `.png`) dans `/wp-content/uploads/...` (`200 OK`).                                                                                                                   | Requête sur un fichier test `test.php` ou `test.php.jpg` placé dans `uploads` bloquée en `403 Forbidden` par le bloc `<FilesMatch>`.                                                                                                                          | Bloque uniquement l'exécution via HTTP dans `uploads` ; ne protège pas les autres dossiers si une écriture est possible ailleurs.                                      |
| **5** | **Code non modifiable par `www-data`**         | Lecture et exécution normale des scripts PHP par Apache (`www-data` a les droits `r-x` / `r--`).                                                                                                                        | Tentative de création ou modification d'un fichier dans `/var/www/.../public` en tant que `www-data` (`sudo -u www-data touch ...`) échoue avec `Permission denied`.                                                                                          | Bloque les mises à jour automatiques de WordPress, thèmes et extensions depuis l'interface web (nécessite une intervention manuelle de l'administrateur).              |
| **6** | **Média normal accessible**                    | Téléchargement et affichage dans le navigateur d'un média uploadé dans la bibliothèque (`200 OK`, bon `Content-Type` respecté avec `nosniff`).                                                                          | Requête sur un fichier inexistant dans `uploads` renvoie `404 Not Found` (`FallbackResource disabled`) au lieu de charger WordPress.                                                                                                                          | Les médias restent accessibles publiquement à toute personne possédant le lien direct (pas de contrôle d'accès par session utilisateur).                               |
| **7** | **Compte éditeur distinct**                    | Connexion au tableau de bord WordPress avec le compte **Éditeur** : création et publication d'articles fonctionnelles.                                                                                                  | Le compte Éditeur n'a pas accès aux menus critiques (installation d'extensions, modification des thèmes, gestion des utilisateurs/réglages réservés à l'Administrateur).                                                                                      | Si le compte Éditeur est compromis, l'attaquant peut tout de même publier du contenu malveillant (phishing, liens frauduleux) sur le site public.                      |
| **8** | **Calendrier et responsable des mises à jour** | Rôle défini : **Responsable :** `admin-alarue` — **Fréquence :** `hebdomadaire` pour le système (`apt`), WordPress et les plugins.                                                                                      | Toute tentative de mise à jour lancée depuis l'interface web WordPress est bloquée par les permissions système (`640`/`2750`).                                                                                                                                | Dépend de la rigueur humaine de l'administrateur : un oubli ou un retard d'application des correctifs laisse le serveur exposé aux vulnérabilités connues.             |


### On durcit le SSH 

Avant de toucher au SSH, on veut faire une sauvegarde de la config actuelle puisque si l'on fait une mauvaise manipulation, on ne pourra plus accéder à notre VM.

On peut donc sauvegarder notre VM avec cette commande : 

```sh
vagrant snapshot save avant-ssh
```

Et si jamais on a besoin on fait : 

```vagrant
vagrant snapshot restore
```

Ainsi, on peut totalement faire les modifications, notamment désactiver l'authentification par mot de passe via un nouveau fichier de configuration ssh nommé ``00-b1-hardening.conf`` dans `/etc/ssh/sshd_config.d/` dans lequel on va mettre : 

```text
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
X11Forwarding no
MaxAuthTries 3
AllowUsers webadmin vagrant
```

Pour vérifier la bonne syntaxe du fichier de configuration : 

```sh
sudo /usr/sbin/sshd -t
```


On peut maintnenat recharger le SSH pour prendre en compte la configuration : 

```sh
sudo systemctl reload ssh
```

Et maintenant il nous refuse l'accès si nous n'utilisons pas notre paire de clé SSH comme le prouve cette écran : 

![[Pasted image 20261125181934.png]]


### Mettre un Firewall sur le bousin avec NFTABLES


Commande d'installation de `nftables` (sous-système de filtrage et de classification des paquets sous linux) (normalement il est déjà installé sous Debian) : 

```sh
sudo apt install nftables
```

On va maintenant essayer de configurer `nftables` pour filtrer notre trafique. Mais avant on va faire une copie de la config actuelle si jamais ça ne marche pas : 

```sh
sudo cp -a /etc/nftables.conf /etc/nftables.conf.avant-b1
```

>[!notes] Ca sert à quoi l'argument `-a`
>`-a` signifie archive et permet de **copier des fichiers et des dossiers à l'identique**, en conservant absolument toutes leurs propriétés d'origine (droits, propriétaires, dates, liens symboliques et structure).

On peut ensuite l'éditer : 

```sh
sudoedit /etc/nftables.conf
```

Et on tombe sur un vieux script bash tout pourri : 

![[Pasted image 20261125182844.png]]

Et donc on peut remplacer cette configuration actuelle par la configuration ci-dessous : 

```nft
#!/usr/sbin/nft -f

# Reset toute configuration de pare-feu
flush ruleset

# Crée une table nommée b1_filter_alexandre de famille inet, ce qui signifie que 
# ses règles s'appliquent simultanément à IPv4 et IPv6

table inet b1_filter {

	# Traffic entrant 
    chain input {
    
	    # Intercepte tout les paquets et les jettent si ils ne correspondent à
	    # rien du tout
        type filter hook input priority 0; policy drop;
        # Rejette tout les paquets malformé 
        ct state invalid drop
        # Accepte les paquets des connexions déjà établies
        ct state established,related accept
        # Accepte tout ce qui vient de lui-même (127.0.0.1)
        iifname "lo" accept
        # Autorise le ping et le IMCP sur l'ipV4
        meta l4proto icmp accept
        # Autorise le ping et l'IMCP sur l'ipV6
        meta l4proto ipv6-icmp accept
        # Accepte le protocole UDP pour les ports 67/68 (DHCP IpV4)
        udp sport 67 udp dport 68 accept
        # Accepte le protoole UDP pour les ports 547/546 (DHCP IpV6)
        udp sport 547 udp dport 546 accept
        # Accepte les connexions sur les ports 22, 80, 443 (indispensable)
        tcp dport { 22, 80, 443 } ct state new accept
        # Impose d'écrire les requêtes "drop" dans les logs à la limite
        # de 3 / 5 requêtes secondes pour ne pas saturer.
        limit rate 3/second burst 5 packets log prefix "B1-ALEXANDRE-DROP: "
        counter drop
    }
    # Traffic redirigé
    chain forward {
	    # On coupe tout (askip on est pas un routeur nous)
        type filter hook forward priority 0; policy drop;
    }
    
    # Traffic sortant
    chain output {
	    # On accepte tout le traffic sortant.
        type filter hook output priority 0; policy accept;
    }
}
```

Une fois que nous avons écrit nos règles de filtrage, nous pouvons executer ces commandes : 

```sh
# Première commande qui nous permet de check la config que nous venons de faire
sudo nft -c -f /etc/nftables.conf
# Notre filet de sécurité si jamais on a fait de la merde (a ne pas appliquer en prod)
sudo systemd-run --unit=alexandre-parefeu-secours --on-active=5m /usr/sbin/nft flush ruleset
```

>[!warning] Pourquoi cette commande ? 
>Cette commande va permettre de réinitialiser les règles de pare-feu 5 minutes après l'éxecution de cette commande grâce à `systemd`.
>Elle va simplement exécuter un `flush-ruleset`. 
>`--unit` : Sert à donner un nom à notre action si jamais on veut l'arrêter, on pourra facilement le faire.

Après tout ça on peut facilement appliquer notre configuration `nftables`

```sh
sudo nft -f /etc/nftables.conf
# Contrôle les règles active en mémoire
sudo nft list ruleset
```

Et on peut voir cela dans notre terminal : 

![[Pasted image 20261125185433.png]]

Maintenant on test le ping, le ssh et le http avec plusieurs commandes et si tout marche on exécute cette commande qui nous permet d'arrêter le timer : 

```sh
sudo systemctl stop alexandre-parefeu-secours.timer
```

Et on active nftables :

```sh
# systemd va creer un lien symbolique dans sysinit.target.wants (la phase très 
# précoce d'initialisation du système, avant même que le réseau ne soit monté)
# pour charger automatiquement le fichier /etc/nftables.service au boot
sudo systemctl enable nftables
```


### Automatiser et vérifier les mises à jour de sécurité

Maintenant on va s'occuper d'installer `unattended_upgrade` qui met à jour automatiquement notre serveur pour ne pas être à risque sur les toutes dernières failles.

```sh
sudo apt install unattended-upgrades
```

Une fois qu'il est installé. On va le reconfigurer pour qu'il puisse télécharger et installer les paquets tout seul comme un grand.

```sh
sudo dpkg-reconfigure -plow unattended-upgrades
```

On peut totalement tester l'outil maintenant et voir ce que ça donne en lançant la commande : 

```sh
sudo unattended-upgrade --dry-run --debug
```

Ou alors, étant donné que `unattended-upgrade` peut planifier des MAJ, on peut regarder les MAJ planifiées avec la commande : 

```sh
systemctl list-timers --all | grep apt
```

>[!warning] Certains reboot sont nécessaires pour appliquer les MAJs
>Les mises à jour automatiques appliquent les correctifs, mais ne redémarrent pas toujours le serveur. Si le fichier `/var/run/reboot-required` apparaît avec la commande :
>`ls -l /var/run/reboot-required`
>Un redémarrage manuel est nécessaire pour activer un nouveau noyau Linux.

## 09 - Exploiter, sauvegarder et restaurer

On va maintenant effectuer une vraie sauvegarde de notre installation professionnelle (parce qu'on est pas débutant).



Le **RPO** correspond à la perte de données maximale visée
Le **RTO**, au temps de reprise visé.

Pour faire des sauvegarde de nos différents service, nous pouvons utiliser ce petit script `bash` qui va s'en occuper presque tout seul :

```sh
#!/bin/bash

# À installer et exécuter uniquement dans la VM du parcours B1.

# Sauvegarde cohérente par arrêt des écritures web ; contient des secrets.

set -Eeuo pipefail

umask 077

# Si jamais on a pas les droits admin
if [[ $EUID -ne 0 ]]; then

  echo 'Exécuter avec sudo dans la VM du TP.' >&2

  exit 1

fi

[[ -f /var/www/atelier/b1-alarue/wp-config.php ]] || { echo 'Site attendu absent.' >&2; exit 1; }

backup_root=/var/backups/b1-alarue-site

stamp=$(date -u +%Y%m%dT%H%M%SZ)

backup_dir="$backup_root/$stamp"

install -d -m 700 "$backup_root"

mkdir -m 700 "$backup_dir"

apache_was_active=0

systemctl is-active --quiet apache2 && apache_was_active=1

resume_services() {

  result=$?

  trap - EXIT

  if [[ $apache_was_active == 1 ]]; then

    systemctl start apache2 || result=1

  fi

  if [[ $result -ne 0 ]]; then

    echo "Sauvegarde ou reprise en échec : $backup_dir ; consulter les services." >&2

  fi

  exit "$result"

}

trap resume_services EXIT

# Hypothèse du TP : aucun autre script ni administrateur ne modifie le site.

systemctl stop apache2

mariadb-dump --single-transaction --routines --events --triggers alaruewp > "$backup_dir/alaruewp.sql"

tar --acls --xattrs -cpf "$backup_dir/site.tar" -C / var/www/b1-alarue

tar --acls --xattrs -cpf "$backup_dir/configuration.tar" -C / \

  etc/apache2 etc/php/8.4/apache2 etc/mysql/mariadb.conf.d \

  etc/ssh/sshd_config.d etc/nftables.conf \

  etc/ssl/certs/b1-alarue.test.crt etc/ssl/private/b1

{

  date -u --iso-8601=seconds

  cat /etc/os-release

  dpkg-query -W apache2 libapache2-mod-php8.4 php8.4-cli mariadb-server

  grep '\$wp_version =' /var/www/b1-alarue/public/wp-includes/version.php

} > "$backup_dir/versions.txt"

(

  cd "$backup_dir"

  sha256sum alaruewp.sql site.tar configuration.tar versions.txt > SHA256SUMS

)

touch "$backup_dir/COMPLETE"

printf 'Sauvegarde locale terminée : %s\n' "$backup_dir"
```

On peut maintenant récupérer 2 choses : 
1 - L'adresse d'une image sur le site wordpress.
2 - L'adresse d'un article wordpress.









