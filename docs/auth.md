# Authentication & authorization services

Suggested solution to fulfill these common tasks is [Keycloak](https://www.keycloak.org/)

## Demo setup

The project has initial dump containing all data structures to accommodate demo dataset.
This fits well for development purposes and saved onboarding time.

## Manual configuration guide

For new environments that are not development ones, consider setting up keycloak manually.

Here are basic steps to get up and running from scratch.

1. Configure KC docker container with db credentials and administrative account username/password
2. Login to [admin console](http://localhost:8180/)
3. Create realm (e.g. with name `aad` - azure active directory)
4. Navigate to menu "Clients"
5. Create client for use with browser single page application (SPA), e.g. with name `api-frontend`
6. Ensure correct URLs are set for root, home, redirect and web origins
7. Save client
8. Navigate to client "Advanced" tab and find "Proof Key for Code Exchange Code Challenge Method" option
9. Set above option to `S256`, and save
10. Navigate to menu "Clients"
11. Create client for use with backend, e.g. with name `api-frontend` and save
12. Enable "Client authentication" option. This sets OIDC type to confidential access type
13. Enable "Authorization" option and save client
14. Navigate to "Authorization" tab of the client
15. Navigate to "Resources" sub menu and press "Create resource" button
16. Enter name `networks`, display name `Network RESTful API resource`, type `urn:network` and URIs `/api/nets/*` and press "Save".
    This will represent RESTful resource `networks`
17. Navigate back to Client details > Authorization
18. Go to "Scopes" tab
19. Press "Create authorization scope", enter name `net:*` and press save.
    This will represent access scope with any type of action for any network, basically admin permission.
20. Create another scope that will apply to specific network.
    Scope name can be constructed by the following pattern: `net:<net_id>:<action>`, where action can be one of `read`, `update`.
    E.g. for network with id `5b3ed0c7-20d3-45fe-8c3b-84acb64750d3` read-only scope will be `net:5b3ed0c7-20d3-45fe-8c3b-84acb64750d3:read`
21. Navigate back to "Resources" tab, open `networks` details, and in the field add scopes we just created, save resource.
22. Navigate to "Policies" submenu of "Authorization" section of the client
23. Press "Create policy". Select option you need. For example, "Group"
24. Enter desired name (e.g. `Administrators group policy`), logic is `Positive`. Select user groups for this policy.
    For this example, let's use (or create) group `grid-administrators`. Save the policy.
25. Finally, navigate to "Permissions" tab and create resource-based permission.
26. Fill in name (e.g. `Networks administration`), select `networks` resource, assign `net:*` scope and `Administrators group policy` for this permission.

Now, we can add users via keycloak admin or allow self-service (registration, account edit) in realm settings. This is the bare minimum setup.
