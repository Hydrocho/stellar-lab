'use strict';
// Keep game difficulty and stored scores in their original units.
// Round only the displayed running total; deltas must reconcile with that total.
var ScoreDisplay={
 total(raw){return Math.floor(raw*5/4);},
 change(before,after){return this.total(after)-this.total(before);},
 format(raw){return this.total(raw).toLocaleString('ko-KR');},
 eventPoints(event){return Number.isFinite(event.scoreBefore)?this.change(event.scoreBefore,event.scoreBefore+event.points):this.total(event.points);}
};
