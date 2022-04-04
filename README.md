# Resume Gateway and Demo Client
- Gateway for Send data from private network into Resume Project
- Demo for Development


- [Resume Gateway and Demo Client](#resume-gateway-and-demo-client)
  - [Installation](#installation)
    - [Preinstallation <a name="Preinstall"></a>](#preinstallation-)
    - [Installation in local PM2 environment](#installation-in-local-pm2-environment)
    - [Installation by Docker Compose](#installation-by-docker-compose)
  - [Configuration](#configuration)
    - [Credentials file <a name="Credentials"></a>](#credentials-file-)
    - [Environmental Variable <a name="Environmental"></a>](#environmental-variable-)
    - [Language - lang.json](#language---langjson)
    - [Section ID (Optional)](#section-id-optional)
      - [Frequent used document `format` <a name="freq-doc"></a>](#frequent-used-document-format-)
    - [User log-in (PUBLIC_DEMO) <a name="user-login"></a>](#user-log-in-public_demo-)
  - [Documentation and Quick Usage Guide](#documentation-and-quick-usage-guide)
    - [Resume Node.JS REST API Connector](#resume-nodejs-rest-api-connector)
    - [Resume Client Socket.IO](#resume-client-socketio)
  - [License](#license)
  - [Contact](#contact)

## Installation

### Preinstallation <a name="Preinstall"></a>
1. Clone this repository into local directory
2. Config the API credential information in **credentials.json** - the details of configuration are in the [Configuration > Credentials file](#Credentials) part.
3. Provide SSL certificate for Socket.IO and HTTPS server.  <br/>  **For private key**, placed at: `./cerbot/privkey.pem` or `./key.pem`,  <br/>  **For certificate**, placed at: `./certbot/cert.pem` or `./cert.pem`


### Installation in local PM2 environment
1. Config the repository as [preinstallation](#Preinstall) section
2. Make sure you have already installed [Node.js and NPM](https://nodejs.org/en/download/)
3. Install package by npm
```shell
cd Resume-Client-Node.js  # move into Resume-Client-Node.js directory
npm install .
```
4. Config host environmental variable, [more detail here](#Environmental)
```shell
export NODE_ENV=production
```
5. Run PM2 app.js
```shell
pm2 start app.js
## pm2 is Node.js process monitoring and management.
# It is better than run node app.js which can terminate by some error.
```

### Installation by Docker Compose
1. Config the repository as [preinstall](#Preinstall) section
2. Make sure you have already installed [Docker Engine](https://docs.docker.com/engine/install/ubuntu/) and [Docker Compose](https://docs.docker.com/compose/install/).
3. Config [docker-compose.yml](docker-compose.yml) file - especially, environment, ports and volume
    ```yaml
    services:
        resume-client:
            ### Other lines of YAML
            ### ......
            environment:
                NODE_ENV: production
                ### Details are below.
            ports:
                - 443:443
                - 80:80
                # depend on HTTP config
            volumes:
                ## This is optional setting.
                - ./:/usr/src/app
            ### Other lines ...
    ```
4. *Optionally*, you can use [".env" file](https://docs.docker.com/compose/environment-variables/#the-env-file) if you prefer to keep these variables in separated file.
   ```
    NODE_ENV=production
   ```
5. Run docker-compose <br/>
   *Optionally*, if you use [".env" file](https://docs.docker.com/compose/environment-variables/#the-env-file), you must add `--env-file` argument to command.
```shell
    ## Please use docker-compose --help for details
    docker-compose -f [path of docker-compose.yml] up
    
    ## Or run the below line to use *.env file.
    docker-compose --env-file [path of ".env" file] -f [path of docker-compose.yml] up
```
Please read [docker-compose documentation](https://docs.docker.com/compose/reference/) for more details.



<br/><br/>

## Configuration
### Credentials file <a name="Credentials"></a>
It store credential key to access Resume API. You can use [credentials.template.json](credentials.template.json) as the template.
1. **host** - path to host of Resume API contains protocol, hostname, port and path
2. **username** - username given from Resume administrative panel
3. **password** - password or token key for access
4. **section_id_default** - default section ID to show in client user interface and to send to Resume API

The default are below.
```JSON
{
    "host": "https://api.sati.co.th",
    "username": "[Your Username]",
    "password": "[Your secret password]",
    "section_id_default": 0
}

```


### Environmental Variable <a name="Environmental"></a>
These variables use for provide essential config for backend.
1. **CREDENTIALS_FILE** - path to [credentials.json](#Credentials) file - default is `credentials.json`
2. **NODE_ENV** - Node.js environmental config - `production` *or* `development`
3. **PORT** - port for HTTP and Socket.IO server - 443 for HTTPS and 80 for HTTP by default
4. **PUBLIC_DEMO** - protect the HTML page by [User login](#user-login) - default is `null` or `false`.
5. **HTTP** - use **HTTP** instead of ***HTTPS*** protocol. For some browser policy, the media stream recorder and session cookie can work **only HTTPS** protocol due to security concern. Therefore we encourage to set `HTTP=0` or leave it `null`, unless you provide HTTPS reverse proxy to serve these Socket.IO and client files by yourself.

```
CREDENTIALS_FILE=credentials.json
NODE_ENV=production
PORT=
PUBLIC_DEMO=
HTTP=
## Note: all can leave null or be omitted to use default values.
```


### Language - lang.json
Array of language suggestion for Resume API locate in [`./public/lang.json`](public/lang.json). The language code must be [BCP-47](https://github.com/libyal/libfwnt/wiki/Language-Code-identifiers) format e.g. `"en"` or `"en-US"`, and ordered by priority (first is the highest).
```JSON
["th", "en", "zh", "ja-JP", "ko-KR"]
```


### Section ID (Optional)
If you prefer to use static `ResumeOne.loadSectionList()` method in [`Resume.js`](public/js/Resume.js) client-side script to manage your section, you must provide [`./public/section_id.json`](public/section_id.json). The file has array containing section-describing objects. Each should have ...
1. **name** - name of section
2. **active** - `true` to activate this section, `false` for otherwise.
3. **format** - format of document to let the Resume API to generate returned data. It must follows the `Name` in **Resource Profile Table** of each ["C-CDA 1.1.0 on FHIR"](http://hl7.org/fhir/us/ccda/artifacts.html#structures-resource-profiles) resource profile, otherwise it will be `Default` (no format). 

**Important!** be careful about the order of each section, because their order are their sectionID which be sent to Resume API. If any section is not used, please set `active: false` instead of remove it from array.
```JSON
[
  { "name": "default", "active": true, "format": "Default" },
  { "name": "OPD Ortho", "active": true, "format": "HistoryAndPhysical" },
  { "name": "OPD Med", "active": true, "format": "HistoryAndPhysical" },
  { "name": "OR", "active": true, "format": "OperativeNote" },
  { "name": "not use", "active": false, "format": "OperativeNote" }
]
```


#### Frequent used document `format` <a name="freq-doc"></a>
1. `Default` - no format
2. [`HistoryAndPhysical`](http://hl7.org/fhir/us/ccda/StructureDefinition-History-and-Physical.html) - [Name](http://hl7.org/fhir/us/ccda/StructureDefinition-History-and-Physical.html#root), [Terminology](http://hl7.org/fhir/us/ccda/StructureDefinition-History-and-Physical.html#terminology-bindings)
3. [`OperativeNote`](http://hl7.org/fhir/us/ccda/StructureDefinition-Operative-Note.html) - [Name](http://hl7.org/fhir/us/ccda/StructureDefinition-Operative-Note.html#root), [Terminology](http://hl7.org/fhir/us/ccda/StructureDefinition-Operative-Note.html#terminology-bindings)
4. [`ConsultationNote`](http://hl7.org/fhir/us/ccda/StructureDefinition-Consultation-Note.html) - [Name](http://hl7.org/fhir/us/ccda/StructureDefinition-Consultation-Note.html#root), [Terminology](http://hl7.org/fhir/us/ccda/StructureDefinition-Consultation-Note.html#terminology-bindings)

Other formats and more details are in ["C-CDA 1.1.0 on FHIR"](http://hl7.org/fhir/us/ccda/artifacts.html#structures-resource-profiles).


### User log-in (PUBLIC_DEMO) <a name="user-login"></a>
If you need user authenication for this Resume Client ([`PUBLIC_DEMO=true`](#Environmental)) and prefer to use [`class SimpleUser`](user.js) as database class, you can put users' data into `user.json` as shown as below. The important property for each user data are ...
1. **key of object** - username
2. **"password"** property - user's password
3. **"limit"** property - (optional) limit usage time in second per day, leave `undefined`, `null` or `minus number` = **unlimited**, `0` or `false` = **deactivate this user**, and `positive number` = **actual limit time per day in second**.

```JSON
{
  "username1": {
    "password": "password1"
  },
  "username2": {
    "password": "secret2",
    "limit": 3600
  },
  "deactivated_username": {
    "password": "password",
    "limit": 0
  }
}
```


## Documentation and Quick Usage Guide

### Resume Node.JS REST API Connector
- [README](https://github.com/pahntanapat/Resume-Node-REST-Connector)
- [Docs](https://github.com/pahntanapat/Resume-Node-REST-Connector/tree/main/docs)

### Resume Client Socket.IO
- [README](https://github.com/pahntanapat/Resume-Client-Socket.IO)
- [Docs](https://github.com/pahntanapat/Resume-Client-Socket.IO/tree/main/docs)

## License
&copy; 2021 -  copyright by Tanapat Kahabodeekanokkul - the founder of `RESUME`.<br/>
Distributed under `RESUME` for clients.

## Contact
Tanapat Kahabodeekanokkul - [sati.co.th](sati.co.th) - contact@sati.co.th <br/>
Project Link: https://github.com/pahntanapat/resume-gateway
