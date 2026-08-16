# MedInsight

MedInsight is a cross-platform health intelligence application for transforming laboratory reports into structured, understandable, and longitudinal health information.

The project is being developed as a full-stack AI healthcare system with a Python backend and installable client applications.

## Status

MedInsight is currently under active development.

## Backend CORS configuration

The backend permits the current Expo Web development origins by default:
`http://localhost:8081` and `http://127.0.0.1:8081`.

Set `MEDINSIGHT_CORS_ORIGINS` to a comma-separated list to replace those local
defaults, for example:

```powershell
$env:MEDINSIGHT_CORS_ORIGINS="http://localhost:8081,http://127.0.0.1:8081"
```

Production deployments should explicitly provide their actual frontend origins.
Wildcard origins are intentionally not enabled.
