/* Pure calculators. All monetary figures use the same user-selected period. */
(function(root){
const n=v=>Math.max(0,Number(v)||0);
function finance(v){const income=n(v.income)+(v.vaOn?n(v.va):0),spending=n(v.spending),gap=income-spending;return {income,spending,gap,runway:gap<0?n(v.savings)/-gap:Infinity,target:spending+n(v.goal),jobTarget:Math.max(0,spending+n(v.goal)-(v.vaOn?n(v.va):0))}}
function funding(v){if(v.exempt==='yes')return 0;if(v.exempt==='unknown')return n(v.manualFee);const down=n(v.down),price=n(v.price),ratio=price?down/price:0;const rate=ratio>=.1?.0125:ratio>=.05?.015:v.firstUse==='no'?.033:.0215;return Math.max(0,price-down)*rate}
function housing(v){const price=n(v.price),down=Math.min(price,n(v.down)),fee=funding(v),base=price-down,loan=base+(v.financeFee?fee:0),r=n(v.rate)/1200,months=Math.max(1,n(v.years)*12);const pi=r?loan*r/(1-Math.pow(1+r,-months)):loan/months;const buy=pi+n(v.tax)+n(v.insurance)+n(v.upkeep)+n(v.buyUtilities)+n(v.hoa),rent=n(v.rent)+n(v.utilities)+n(v.rentInsurance);return {fee,loan,pi,buy,rent,difference:buy-rent,rentCash:n(v.rent)+n(v.deposit)+n(v.move),buyCash:down+n(v.closing)+n(v.move)+(v.financeFee?0:fee)}}
root.CalcMath={finance,housing,funding};if(typeof module!=='undefined')module.exports=root.CalcMath;
})(typeof globalThis!=='undefined'?globalThis:this);
