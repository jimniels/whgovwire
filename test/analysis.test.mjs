import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../src/analysis.mjs';
const link = (url, domain, daysOnPage = 1) => ({url, domain, daysOnPage, firstSeen:'2026-11-01T19:08:00.000Z',lastSeen:'2026-11-19T19:08:00.000Z',text:'Headline'});

test('ranks links by observed days, rather than apparent first-to-last span', () => {
 const sparse=link('https://a.com/sparse','a.com',2);
 const frequent={...link('https://a.com/frequent','a.com',5),firstSeen:'2026-11-15T19:08:00.000Z'};
 assert.equal(summarize([sparse,frequent]).longest[0].url,frequent.url);
});
test('groups YouTube aliases and counts alternate URLs to one video once', () => {
 const data=[link('https://youtu.be/abc?t=10','youtu.be'),link('https://www.youtube.com/watch?v=abc&feature=share','youtube.com'),link('https://youtube.com/shorts/abc','youtube.com'),link('https://youtube.com/live/def','youtube.com'),link('https://youtube.com/embed/def','youtube.com'),link('https://example.com/a','example.com')];
 assert.deepEqual(summarize(data).domains,[{domain:'youtube.com',count:2},{domain:'example.com',count:1}]);
 assert.equal(data[0].domain,'youtu.be');
});
test('limits both rankings to twenty and does not modify dataset ordering', () => {
 const data=Array.from({length:25},(_,i)=>link(`https://d${i}.com/a`,`d${i}.com`,i+1));
 assert.equal(summarize(data).longest.length,20);
 assert.equal(summarize(data).domains.length,20);
 assert.equal(data[0].daysOnPage,1);
});
