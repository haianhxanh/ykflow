(()=>{var e={};e.id=888,e.ids=[888],e.modules={4228:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>j});var r=s(997);s(6764);var i=s(1649),n=s(9108),o=s(7373),a=s.n(o),u=s(6096),c=s.n(u),l=s(5675),d=s.n(l),E=s(1664),x=s.n(E),m=s(9332);function p({children:e}){let{status:t,data:s}=(0,i.useSession)(),o=(0,m.usePathname)();return(0,r.jsxs)(r.Fragment,{children:[r.jsx("div",{className:"flex justify-center my-4",children:r.jsx(x(),{href:"/",children:r.jsx(d(),{src:"/yeskrabicky-logo.png",width:100,height:200,alt:"logo"})})}),o!=n.ns.LOGIN&&(0,r.jsxs)(a(),{container:!0,className:"flex justify-center",children:["authenticated"!==t&&r.jsx(c(),{variant:"outlined",onClick:()=>{(0,i.signIn)()},children:n.KL.LOGIN}),"authenticated"===t&&r.jsx(c(),{variant:"outlined",onClick:()=>{(0,i.signOut)()},children:n.KL.LOGOUT})]})]})}function N({children:e}){return r.jsx(r.Fragment,{children:e})}function h({children:e}){return(0,r.jsxs)(r.Fragment,{children:[r.jsx(p,{children:e}),r.jsx(N,{children:e})]})}function j({Component:e,pageProps:t}){return r.jsx(i.SessionProvider,{session:t.session,children:r.jsx(h,{...t,children:r.jsx(e,{...t})})})}},9108:(e,t,s)=>{"use strict";s.d(t,{KL:()=>n,Q_:()=>r,dT:()=>a,l$:()=>i,ns:()=>o});let r={NEW:"NEW",APPROVED:"APPROVED",DECLINED:"DECLINED"},i={NEW:"Nov\xfd požadavek",APPROVED:"Vyhověno",DECLINED:"Zam\xedtnuto"},n={LOGOUT:"Odhl\xe1sit se",LOGIN:"Přihl\xe1sit se",USERNAME:"Uživatelsk\xe9 jm\xe9no",PASSWORD:"Heslo",INCORRECT_CREDENTIALS:"Zadejte spr\xe1vn\xe9 jm\xe9no a heslo",HANDLE_INQUIRY:"Vyř\xeddit",HANDLE_INQUIRY_NOTE:"Po zam\xedtnut\xed nebo schv\xe1len\xed ž\xe1dosti z\xe1kazn\xedka informujte e-mailem.",APPROVE:"Schv\xe1lit",DECLINE:"Zam\xedtnout",NO_INQUIRIES:"Zat\xedm nem\xe1te ž\xe1dn\xe9 požadavky"},o={LOGIN:"/auth/login"},a={REQUEST_ID:"ID",ORDER_NAME:"Obj.",ORDER_CONTACT:"Z\xe1kazn\xedk",ITEM:"Krabička",REQUEST_DATE:"Přijet\xed ž\xe1dosti",PAUSE_START_DATE:"Zač\xe1tek pozastaven\xed",PAUSE_END_DATE:"Konec pozastaven\xed",NEW_END_DATE:"Nov\xe9 datum ukončen\xed",STATUS:"Stav ž\xe1dosti"}},6764:()=>{},9295:e=>{"use strict";e.exports=require("@mui/base/composeClasses")},7986:e=>{"use strict";e.exports=require("@mui/system")},657:e=>{"use strict";e.exports=require("@mui/utils")},8103:e=>{"use strict";e.exports=require("clsx")},1649:e=>{"use strict";e.exports=require("next-auth/react")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},2785:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/pages.runtime.prod.js")},580:e=>{"use strict";e.exports=require("prop-types")},6689:e=>{"use strict";e.exports=require("react")},6405:e=>{"use strict";e.exports=require("react-dom")},4466:e=>{"use strict";e.exports=require("react-transition-group")},997:e=>{"use strict";e.exports=require("react/jsx-runtime")}};var t=require("../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),r=t.X(0,[556,356],()=>s(4228));module.exports=r})();