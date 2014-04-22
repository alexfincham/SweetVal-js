
var unproxy = new WeakMap();

function isProxy(p) {
   if (typeof p !== 'object')
      return false;
   else
      return unproxy.has(p);
}


var secret = {};

// String->Int->Quantity->Quantity
function makeQuantity(u, i, n) {
   var h = null;
   if (isProxy(n)) {
      //*** DEBUG
      console.log("makeQuantity: fetching n.handler...");
      
      h = unproxy.get(n).handler;
   }

   if (i === 0)
      return n;
   else if (h && h.unit === u) {
      //*** DEBUG
      console.log("makeQuantity returning: unit = "+u+", index = "+(h.index+i)+", value = "+h.val);
      
      var ix = h.index + i;
      return makeQuantity(u, ix, h.val);
   }else if (h && h.unit > u) {
      //*** DEBUG
      console.log("makeQuantity returning: unit = "+h.unit+", index = "+(h.index)+", value = Quantity {"+u+", "+i+", "+h.val+"}");

      return makeQuantity(h.unit, h.index, makeQuantity(u, i, h.val));
   }else {
      var handle = {
         unit: u,
         index: i,
         val: n,
         // ops
         unary: function(o) {
            return unitUnaryOps[o].call(null, this.unit, this.index, this.val);
         },
         left: function(o, r) {
            return unitLeftOps[o].call(null, this.unit, this.index, this.val, r);
         },
         right: function(o, l) {
            return unitRightOps[o].call(null, this.unit, this.index, this.val, l);
         },
         test: function() {
            return getValue(this.val);
         }
      };
      var p = new Proxy(secret, handle);
      unproxy.set(p, {
         handler: handle
      });

      //*** DEBUG
      var bsunit = unproxy.get(p).handler.unit;
      var bsindex = unproxy.get(p).handler.index;
      var bsvalue = unproxy.get(p).handler.val;
      console.log("just made Quantity: unit = "+bsunit+", index = "+bsindex+", value = "+bsvalue);
      var tp = typeof p;
      console.log("type of p = "+tp);

      return p;
   }
}

var unitUnaryOps = {
   "-": function(u, i, n) {
      makeQuantity(u, i, proxyMinus(n));
   }
}

var unitLeftOps = {
   "+": function(u, i, n, r) {
      return makeQuantity(u, i, proxyAdd(n, dropUnit(u, i, r)));
   },
   "-": function(u, i, n, r) {
      return makeQuantity(u, i, proxySub(n, dropUnit(u, i, r)));
   },
   "*": function(u, i, n, r) {
      return makeQuantity.call(null, u, i, proxyMult(n, r));
   },
   "/": function(u, i, n, r) {
      return makeQuantity(u, i, proxyDiv(n, r));
   },
   "=": function(u, i, n, r) {
      n = (dropUnit(u, i, r));
      return n;
   }
   // Add more binary ops
}

var unitRightOps = {
   // left arg is never a proxy!
   "+": function(u, i, n, l) {
      alert("Can't add Num to Unit of measure\nWe're Screwed!");
   },
   "-": function(u, i, n, l) {
      alert("Can't subtract Num to Unit of measure\nWe're Screwed!");
   },
   "*": function(u, i, n, l) {
      return makeQuantity.call(null, u, i, proxyMult(l, n));
   },
   "/": function(u, i, n, l) {
      return makeQuantity(u, (-i), proxyDiv(l, n));
   },
   "=": function(u, i, n, l) {
      alert("= UNIT MISMATCH can't assign");
   }
   // Add more binary ops
}

function dropUnit(u, i, n) {
   var h = null;
   if (isProxy(n))
      h = unproxy.get(n).handler;

   if (h !== null && h.unit === u && h.index === i) {
      return h.val;
   }else {
      alert("Could not dropUnit BEEZY");
   }
}

var unitRecord = {
   // String->Quantity
   makeUnit: function (u) {
      return makeQuantity(u, 1, 1);
   }
}

function getValue(n) {
   var h = null;
   if (isProxy(n)) {
      console.log("getValue: setting h = handler");
      h = unproxy.get(n).handler;
   }

   if (h !== null) {
      console.log("getValue recursing...");
      return getValue(h.val);
   }else {
      console.log("getValue returning" + n);
      return n;
   }
}

function mtoKmThunk (q) {
   return { c: f, arg: q, computed: false };
};

var f = function() {
   // COME BACK TO THIS THUNK LATER!
   if (!this.computed) {
      this.computed = true;
   }
   var km = unitRecord['makeUnit'].call(null, "kilometer");
   var res = proxyMult((getValue(this.arg) / 1000), km);
   return res;
};

function delay(thunk) {
   var r;
   var z = function () {
      if(!thunk.computed) {
         r = thunk.c();
      }
      console.log("delay: z: returning r = "+r+"\nrvalue = "+getValue(r));
      return r;
   }

   var handle = {
      unary: function(o) {
         return unaryOps(z());
      },
      left: function (o, r) {
         return binOps[o].call(null, z(), r);
      },
      right: function (o, l) {
         return binOps[o].call(null, z(), l);
      },
      test: function() {
         return getValue(z());
      }
   };
   var p = new Proxy (secret, handle);
   unproxy.set(p, {
      handler: handle
   });

   return p;
}

var unaryOps = {
   "-": function(x) {
      return -x;
   }
}

var binOps = {
   "+": function(l, r) {
      return proxyAdd(l, r);
   },
   "-": function(l, r) {
      return proxySub(l, r);
   },
   "/": function (l, r) {
      return proxyDiv(l, r);
   },
   "*": function (l, r) {
      return proxyMult(l, r);
   },
   //Add other binary ops
}

function proxyEq (l, r) {
   var lhs, rhs;
   if (isProxy(l) && isProxy(r)) {
      lhs = unproxy.get(l).handler.test();
      rhs = unproxy.get(r).handler.test();
      return lhs === rhs;
   }else if (isProxy(l)) {
      lhs = unproxy.get(l).handler.test();
      return lhs === r;
   }else if (isProxy(r)) {
      rhs = unproxy.get(r).handler.test();
      return l === rhs;
   }else {
      return l === r;
   }
}


function proxyGt (l, r) {
   var lhs, rhs;
   if (isProxy(l) && isProxy(r)) {
      lhs = unproxy.get(l).handler.test();
      rhs = unproxy.get(r).handler.test();
      return lhs > rhs;
   }else if (isProxy(l)) {
      lhs = unproxy.get(l).handler.test();
      return lhs > r;
   }else if (isProxy(r)) {
      rhs = unproxy.get(r).handler.test();
      return l > rhs;
   }else {
      return l > r;
   }
}

function proxyMult (l, r) {
   if (isProxy(l)) {
      return unproxy.get(l).handler.left("*", r);
   }else if (isProxy(r)) {
      return unproxy.get(r).handler.right("*", l);
   }else {
      return l * r;
   }
}

function proxyAdd (l, r) {
   if (isProxy(l)) {
      return unproxy.get(l).handler.left("+", r);
   }else if (isProxy(r)) {
      return unproxy.get(r).handler.right("+", l);
   }else {
      return l + r;
   }
}

function proxyDiv (l, r) {
   if (isProxy(l)) {
      return unproxy.get(l).handler.left("/", r);
   }else if (isProxy(r)) {
      return unproxy.get(r).handler.right("/", l);
   }else {
      return l / r;
   }
}

function proxySub (l, r) {
   if (isProxy(l)) {
      return unproxy.get(l).handler.left("-", r);
   }else if (isProxy(r)) {
      return unproxy.get(r).handler.right("-", l);
   }else {
      return l - r;
   }
}

function proxyMinus(r) {
   if (isProxy(r)) {
      return unproxy.get(r).handler.unary("-");
   }else {
      return -r;
   }
}

(function() {
   macro + {
      rule infix { $lhs:expr | $rhs:expr } => {
         proxyAdd($lhs, $rhs)
      }
   }

   macro  - {
      rule infix { $lhs:expr | $rhs:expr } => {
         proxySub($lhs, $rhs)
      }
   
      rule infix { | $rhs:expr } => {
         proxyMinus($rhs)
      }
   }
   
   macro / {
      rule infix { $lhs:expr | $rhs:expr } => {
         proxyDiv($lhs, $rhs)
      }
   }

   macro * {
      rule infix { $lhs:expr | $rhs:expr } => {
         proxyMult($lhs, $rhs)
      }
   }

   macro === {
      rule infix { $lhs:expr | $rhs:expr  } => {
         proxyEq($lhs, $rhs)
      }
   }
   
   macro > {
      rule infix { $lhs:expr | $rhs:expr  } => {
         proxyGt($lhs, $rhs)
      }
   }

   // *** TEST CODE
   var meter = unitRecord['makeUnit'].call(null, "meter");
   var kilometer = unitRecord['makeUnit'].call(null, "kilometer");
   var second = unitRecord['makeUnit'].call(null, "second");
   
   var g = 9.81 * meter * second * second;
   
   var sprint = 100 * meter;
   console.log("no thunks YET!");
   
   var lazy = delay(mtoKmThunk(sprint));
   console.log(lazy);
   var hifive = lazy + (5 * kilometer);
   
   console.log(getValue(hifive));
   
   console.log(getValue(g));
   console.log(getValue(sprint));
   
   console.log(sprint > g);
   
   var crap = g + 1; //should alert box error
})();
