# OIDC setup

Set `BETTER_AUTH_URL` to Hometime's public URL, then configure:

```env
OIDC_ISSUER=https://id.example.com
OIDC_CLIENT_ID=hometime
OIDC_CLIENT_SECRET=your-client-secret
OIDC_PROVIDER_NAME=Pocket ID
```

Register `<BETTER_AUTH_URL>/api/auth/callback/oidc` as the provider's redirect URI. If the provider requires post-logout URLs to be allowlisted, add `<BETTER_AUTH_URL>/` so sign-out returns to Hometime. Set `ENABLE_SIGNUP=true` to allow new accounts. Existing users can connect OIDC from **Account settings** after signing in locally. Restart Hometime after changing these settings.
