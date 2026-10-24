// Both the room and its embedded desktop use the same private guest identity.
export function invitationLocation() {
    const params = new URLSearchParams(window.location.search);
    const match = window.location.pathname.match(/^\/invite\/([^/]+)\/?$/);
    return {
        slug: match ? decodeURIComponent(match[1]) : params.get('guest') || 'demo',
        accessToken: params.get('key') || '',
    };
}

export function directInvitationUrl() {
    const { slug, accessToken } = invitationLocation();
    const url = new URL('/invitation.html', window.location.origin);
    url.searchParams.set('guest', slug);
    if (accessToken) url.searchParams.set('key', accessToken);
    return url.pathname + url.search;
}
