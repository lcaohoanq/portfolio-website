import './style.css';

import Application from './Application/Application';
import { directInvitationUrl } from './Invitation/location';

try {
    new Application();
} catch (error) {
    // The invitation remains usable when a device cannot render the 3D room.
    window.location.replace(directInvitationUrl());
}
