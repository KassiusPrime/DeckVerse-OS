import economyRepository from '../repositories/economyRepository.js';

export const economyMetrics=Object.freeze({
  summary:()=>economyRepository.auditSnapshot(),
});
export default economyMetrics;
