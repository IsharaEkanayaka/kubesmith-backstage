import {
  createBackendModule,
  coreServices,
} from '@backstage/backend-plugin-api';
import { githubAuthenticator } from '@backstage/plugin-auth-backend-module-github-provider';
import {
  authProvidersExtensionPoint,
  createOAuthProviderFactory,
} from '@backstage/plugin-auth-node';

export default createBackendModule({
  pluginId: 'auth',
  moduleId: 'github-provider',
  register(reg) {
    reg.registerInit({
      deps: {
        providers: authProvidersExtensionPoint,
        logger: coreServices.logger,
      },
      async init({ providers, logger }) {
        providers.registerProvider({
          providerId: 'github',
          factory: createOAuthProviderFactory({
            authenticator: githubAuthenticator,
            async signInResolver(info, ctx) {
              const username = info.result.fullProfile.username;
              if (!username) {
                throw new Error('GitHub profile has no username');
              }
              logger.info(`GitHub sign-in for user: ${username}`);
              // Issues a Backstage token directly from the GitHub username.
              // Does NOT require a matching User entity in the catalog.
              return ctx.issueToken({
                claims: {
                  sub: `user:default/${username}`,
                  ent: [`user:default/${username}`],
                },
              });
            },
          }),
        });
      },
    });
  },
});
