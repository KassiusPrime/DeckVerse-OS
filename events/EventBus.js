class EventBus {
  constructor(){this.handlers=new Map();}
  on(eventType,handler){if(typeof handler!=='function')throw new TypeError('EVENT_HANDLER_REQUIRED');const list=this.handlers.get(eventType)||[];list.push(handler);this.handlers.set(eventType,list);return()=>this.off(eventType,handler);}
  off(eventType,handler){const list=this.handlers.get(eventType)||[];this.handlers.set(eventType,list.filter(x=>x!==handler));}
  async emit(event){if(!event?.type)throw Object.assign(new Error('EVENT_TYPE_REQUIRED'),{code:'EVENT_TYPE_REQUIRED'});const list=[...(this.handlers.get(event.type)||[]),...(this.handlers.get('*')||[])];const results=await Promise.allSettled(list.map(handler=>handler(event)));return Object.freeze({event,results});}
  clear(){this.handlers.clear();}
}

export const eventBus=new EventBus();
export { EventBus };
export default eventBus;
