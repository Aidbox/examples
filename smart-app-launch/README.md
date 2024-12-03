# Launch growth-chart smart app on Aidbox and auth and login via KeyCloack



``` sh
docker compose up
```

aidbox - http://localhost:8080
keycloak - http://localhost:8888
growth-chart - http://localhost:9000

## EHR launch

### Patient launch

Open http://localhost:7070/launcher.html (Demo Smart APP launcher)


Need launch uri

``` curl-config
POST /rpc

method: aidbox.smart/get-launch-uri
params:
  user: patient
  iss: http://localhost:8080
  client: growth_chart
  ctx:
    patient: patient
```

http://localhost:9000
login using KeyCloack
username: provider
password: provider

### Provider launch

``` curl-config
POST /rpc

method: aidbox.smart/get-launch-uri
params:
  user: provider
  iss: http://localhost:8080
  client: growth_chart
  ctx:
    patient: patient
```

## Stand alone launch

### Patient launch

`user.fhirUser` should be ref to Patient

http://localhost:9000
login using KeyCloack
username: patient
password: patient


### Provider launch - not supported
