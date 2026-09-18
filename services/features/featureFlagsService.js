import featureFlagsRepository from '../repositories/featureFlagsRepository.js';
export const featureFlagsService=Object.freeze({isEnabled:(name,environment='production')=>featureFlagsRepository.isEnabled(name,environment),snapshot:(environment='production')=>featureFlagsRepository.snapshot(environment),set:(name,enabled,environment='production',description='')=>featureFlagsRepository.set(name,enabled,environment,description)});
export default featureFlagsService;
