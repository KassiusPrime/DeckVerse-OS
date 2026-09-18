export function createAchievementHandler(achievementService){return async event=>{if(typeof achievementService?.handle!=='function')return null;return achievementService.handle(event);};}
