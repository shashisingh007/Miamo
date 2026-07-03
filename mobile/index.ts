// Miamo Mobile — Expo entry. Uses `registerRootComponent` which handles
// AppRegistry.registerComponent + wraps App inside Expo's root component so
// it works both in Expo Go and standalone (EAS-built) apps.
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
