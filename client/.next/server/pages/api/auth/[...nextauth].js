"use strict";(()=>{var e={};e.id=748,e.ids=[748],e.modules={145:e=>{e.exports=require("next/dist/compiled/next-server/pages-api.runtime.prod.js")},6249:(e,t)=>{Object.defineProperty(t,"l",{enumerable:!0,get:function(){return function e(t,r){return r in t?t[r]:"then"in t&&"function"==typeof t.then?t.then(t=>e(t,r)):"function"==typeof t&&"default"===r?t:void 0}}})},7109:(e,t,r)=>{r.r(t),r.d(t,{config:()=>A,default:()=>c,routeModule:()=>f});var n={};r.r(n),r.d(n,{default:()=>P});var a=r(1802),i=r(7153),s=r(6249);let u=require("next-auth");var o=r.n(u);let l=require("next-auth/providers/credentials");var d=r.n(l);let p={secret:process.env.NEXTAUTH_SECRET,session:{strategy:"jwt",maxAge:14400},providers:[d()({type:"credentials",credentials:{username:{label:"Uživatel",type:"text",placeholder:"yeskrabicky"},password:{label:"Heslo",type:"password"}},async authorize(e,t){let{username:r,password:n}=e;if(r!==process.env.APP_USERNAME||n!==process.env.APP_PASSWORD)throw Error("Invalid credentials");return{username:"yeskrabicky"}}})],pages:{signIn:"/auth/login"}},P=o()(p),c=(0,s.l)(n,"default"),A=(0,s.l)(n,"config"),f=new a.PagesAPIRouteModule({definition:{kind:i.x.PAGES_API,page:"/api/auth/[...nextauth]",pathname:"/api/auth/[...nextauth]",bundlePath:"",filename:""},userland:n})},7153:(e,t)=>{var r;Object.defineProperty(t,"x",{enumerable:!0,get:function(){return r}}),function(e){e.PAGES="PAGES",e.PAGES_API="PAGES_API",e.APP_PAGE="APP_PAGE",e.APP_ROUTE="APP_ROUTE"}(r||(r={}))},1802:(e,t,r)=>{e.exports=r(145)}};var t=require("../../../webpack-api-runtime.js");t.C(e);var r=t(t.s=7109);module.exports=r})();