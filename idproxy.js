// Just the identity proxy

// WeakMap to track all proxies
var unproxy = new WeakMap();
function identityProxy (x) {
   var handler = {
      apply: function (target, thisValue, args) {
         return x.apply(thisValue, args);
      },
      unary: function (o) {
         return unaryOps[o].call(null, x);
      },
      left: function(o, r) {
         return binOps[o].call(null, x, r);
      },
      right: function(o, l) {
         return binOps[o].call(null, l, x);
      },
      test: function() {
         return x;
      }
   };
   var fish = {};
   var p = new Proxy(fish, handler);
   unproxy.set(p, {
      handler: handler,
      target: fish
   });
   return p;
}

var unaryOps = {
   "!": function(x) {
      return !x;
   },
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

function isProxy(p) {
   if (typeof p !== 'object')
      return false;
   else
      return unproxy.has(p);
}

function proxyAdd(l, r) {
   if (isProxy(l)) {
      return unproxy.get(l).handler.left("+", r);
   }else if (isProxy(r)) {
      return unproxy.get(r).handler.right("+", l);
   }else {
      return l + r;
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

function proxyDiv(l, r) {
   if (isProxy(l)) {
      return unproxy.get(l).handler.left("/", r);
   }else if (isProxy(r)) {
      return unproxy.get(r).handler.right("/", l);
   }else {
      return l / r;
   }
}

function proxyMult(l, r) {
   if (isProxy(l)) {
      return unproxy.get(l).handler.left("*", r);
   }else if (isProxy(r)) {
      return unproxy.get(r).handler.right("*", l);
   }else {
      return l * r;
   }
}

// anonymous function to modularize macros and prevent recursive macro
// expansion within the proxy[..Op..]() function calls
(function() {
   macro + {
      rule infix { $lhs:expr | $rhs:expr } => {
         proxyAdd($lhs, $rhs)
      }
   }

   macro - {
      rule infix { $lhs:expr | $rhs:expr } => {
         proxySub($lhs, $rhs)
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
   
   // test code
   var x = 10 ;
   var y = 2.5 ;
   var z = 5 ;
   var res = identityProxy(x) + y;
   var both = identityProxy(x) + identityProxy(z);
   var divided = identityProxy(both) / identityProxy(y);
   
   console.log(res);
   console.log(both);
   console.log(divided);
})();
