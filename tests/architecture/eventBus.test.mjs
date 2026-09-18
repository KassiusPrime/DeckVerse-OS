import assert from 'node:assert/strict';
import {EventBus} from '../../events/EventBus.js';
const bus=new EventBus();const seen=[];bus.on('TEST_EVENT',async event=>{seen.push(['a',event.payload.value]);return 'ok';});bus.on('TEST_EVENT',async()=>{throw new Error('handler failure');});
const result=await bus.emit({type:'TEST_EVENT',payload:{value:42}});
assert.deepEqual(seen,[['a',42]]);assert.equal(result.results.length,2);assert.equal(result.results[0].status,'fulfilled');assert.equal(result.results[1].status,'rejected');console.log('event bus: ok');
