import { APIError } from './minisky.js';

/**
 * Thrown when DID or DID document is invalid.
 */

export class DIDError extends Error {}

export class LoginError extends Error {}


/** @param {string} did, @returns {Promise<string>} */

export async function pdsEndpointForDID(did) {
  let documentURL;

  if (did.startsWith('did:plc:')) {
    documentURL = new URL(`https://plc.directory/${did}`);

  } else if (did.startsWith('did:web:')) {
    let host = did.replace(/^did:web:/, '');
    documentURL = new URL(`https://${host}/.well-known/did.json`);

  } else {
    throw new DIDError(`Unknown DID type: ${did}`);
  }

  let response = await fetch(documentURL);
  let text = await response.text();
  let json = text.trim().length > 0 ? JSON.parse(text) : undefined;

  if (response.status == 200) {
    let service = (json.service || []).find(s => s.id == '#atproto_pds');

    if (service) {
      return service.serviceEndpoint.replace('https://', '');
    } else {
      throw new DIDError("Missing #atproto_pds service definition");
    }
  } else {
    throw new APIError(response.status, json);
  }
}

/** @param {string} identifier, @returns {Promise<string>} */

export async function pdsEndpointForIdentifier(identifier) {
  if (identifier.match(/^did:/)) {
    return await pdsEndpointForDID(identifier);

  } else if (identifier.match(/^[^@]+@[^@]+$/)) {
    return 'bsky.social';

  } else if (identifier.match(/^@?[\w\-]+(\.[\w\-]+)+$/)) {
    identifier = identifier.replace(/^@/, '');
    let did = await appView.resolveHandle(identifier);
    return await pdsEndpointForDID(did);

  } else {
    throw new LoginError('Please enter your handle or DID.');
  }
}
