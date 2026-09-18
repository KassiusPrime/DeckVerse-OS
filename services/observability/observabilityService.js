import observabilityRepository from '../repositories/observabilityRepository.js';
export const observabilityService=Object.freeze({snapshot:()=>observabilityRepository.snapshot(),recordError:(...a)=>observabilityRepository.recordError(...a),recordSystem:(...a)=>observabilityRepository.recordSystem(...a)});
export default observabilityService;
