import { registerRootComponent } from 'expo';
import Purchases from 'react-native-purchases';
import App from './App';

Purchases.configure({ apiKey: 'goog_vrFlxIUsUSXrcsQmDIeTXwkAiLj' });
registerRootComponent(App);
