import { createApp } from '@backstage/frontend-defaults';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import { navModule } from './modules/nav';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { SignInPage } from '@backstage/core-components';
import { githubAuthApiRef } from '@backstage/core-plugin-api';

const githubProvider = {
  id: 'github',
  title: 'GitHub',
  message: 'Sign in with your GitHub account',
  apiRef: githubAuthApiRef,
};

// Overrides the default guest-only sign-in page (sign-in-page:app/default)
// by declaring a module with pluginId 'app' — createFrontendModule applies
// that namespace, producing the same extension ID and replacing the original.
const signInModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    SignInPageBlueprint.make({
      params: {
        loader: async () => props => (
          <SignInPage {...props} providers={[githubProvider]} />
        ),
      },
    }),
  ],
});

export default createApp({
  features: [catalogPlugin, navModule, signInModule],
});
