(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))e(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const n of o.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&e(n)}).observe(document,{childList:!0,subtree:!0});function s(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function e(i){if(i.ep)return;i.ep=!0;const o=s(i);fetch(i.href,o)}})();/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const L=globalThis,J=L.ShadowRoot&&(L.ShadyCSS===void 0||L.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Z=Symbol(),rt=new WeakMap;let gt=class{constructor(t,s,e){if(this._$cssResult$=!0,e!==Z)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=s}get styleSheet(){let t=this.o;const s=this.t;if(J&&t===void 0){const e=s!==void 0&&s.length===1;e&&(t=rt.get(s)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&rt.set(s,t))}return t}toString(){return this.cssText}};const Mt=r=>new gt(typeof r=="string"?r:r+"",void 0,Z),Pt=(r,...t)=>{const s=r.length===1?r[0]:t.reduce((e,i,o)=>e+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+r[o+1],r[0]);return new gt(s,r,Z)},Ot=(r,t)=>{if(J)r.adoptedStyleSheets=t.map(s=>s instanceof CSSStyleSheet?s:s.styleSheet);else for(const s of t){const e=document.createElement("style"),i=L.litNonce;i!==void 0&&e.setAttribute("nonce",i),e.textContent=s.cssText,r.appendChild(e)}},ot=J?r=>r:r=>r instanceof CSSStyleSheet?(t=>{let s="";for(const e of t.cssRules)s+=e.cssText;return Mt(s)})(r):r;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:Tt,defineProperty:Ct,getOwnPropertyDescriptor:Nt,getOwnPropertyNames:Ut,getOwnPropertySymbols:Rt,getPrototypeOf:Ht}=Object,B=globalThis,nt=B.trustedTypes,Lt=nt?nt.emptyScript:"",It=B.reactiveElementPolyfillSupport,M=(r,t)=>r,D={toAttribute(r,t){switch(t){case Boolean:r=r?Lt:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,t){let s=r;switch(t){case Boolean:s=r!==null;break;case Number:s=r===null?null:Number(r);break;case Object:case Array:try{s=JSON.parse(r)}catch{s=null}}return s}},G=(r,t)=>!Tt(r,t),at={attribute:!0,type:String,converter:D,reflect:!1,useDefault:!1,hasChanged:G};Symbol.metadata??=Symbol("metadata"),B.litPropertyMetadata??=new WeakMap;let x=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,s=at){if(s.state&&(s.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((s=Object.create(s)).wrapped=!0),this.elementProperties.set(t,s),!s.noAccessor){const e=Symbol(),i=this.getPropertyDescriptor(t,e,s);i!==void 0&&Ct(this.prototype,t,i)}}static getPropertyDescriptor(t,s,e){const{get:i,set:o}=Nt(this.prototype,t)??{get(){return this[s]},set(n){this[s]=n}};return{get:i,set(n){const h=i?.call(this);o?.call(this,n),this.requestUpdate(t,h,e)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??at}static _$Ei(){if(this.hasOwnProperty(M("elementProperties")))return;const t=Ht(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(M("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(M("properties"))){const s=this.properties,e=[...Ut(s),...Rt(s)];for(const i of e)this.createProperty(i,s[i])}const t=this[Symbol.metadata];if(t!==null){const s=litPropertyMetadata.get(t);if(s!==void 0)for(const[e,i]of s)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[s,e]of this.elementProperties){const i=this._$Eu(s,e);i!==void 0&&this._$Eh.set(i,s)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const s=[];if(Array.isArray(t)){const e=new Set(t.flat(1/0).reverse());for(const i of e)s.unshift(ot(i))}else t!==void 0&&s.push(ot(t));return s}static _$Eu(t,s){const e=s.attribute;return e===!1?void 0:typeof e=="string"?e:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),this.renderRoot!==void 0&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,s=this.constructor.elementProperties;for(const e of s.keys())this.hasOwnProperty(e)&&(t.set(e,this[e]),delete this[e]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Ot(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,s,e){this._$AK(t,e)}_$ET(t,s){const e=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,e);if(i!==void 0&&e.reflect===!0){const o=(e.converter?.toAttribute!==void 0?e.converter:D).toAttribute(s,e.type);this._$Em=t,o==null?this.removeAttribute(i):this.setAttribute(i,o),this._$Em=null}}_$AK(t,s){const e=this.constructor,i=e._$Eh.get(t);if(i!==void 0&&this._$Em!==i){const o=e.getPropertyOptions(i),n=typeof o.converter=="function"?{fromAttribute:o.converter}:o.converter?.fromAttribute!==void 0?o.converter:D;this._$Em=i;const h=n.fromAttribute(s,o.type);this[i]=h??this._$Ej?.get(i)??h,this._$Em=null}}requestUpdate(t,s,e,i=!1,o){if(t!==void 0){const n=this.constructor;if(i===!1&&(o=this[t]),e??=n.getPropertyOptions(t),!((e.hasChanged??G)(o,s)||e.useDefault&&e.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(n._$Eu(t,e))))return;this.C(t,s,e)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,s,{useDefault:e,reflect:i,wrapped:o},n){e&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,n??s??this[t]),o!==!0||n!==void 0)||(this._$AL.has(t)||(this.hasUpdated||e||(s=void 0),this._$AL.set(t,s)),i===!0&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(s){Promise.reject(s)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[i,o]of this._$Ep)this[i]=o;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[i,o]of e){const{wrapped:n}=o,h=this[i];n!==!0||this._$AL.has(i)||h===void 0||this.C(i,void 0,o,h)}}let t=!1;const s=this._$AL;try{t=this.shouldUpdate(s),t?(this.willUpdate(s),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(s)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(s)}willUpdate(t){}_$AE(t){this._$EO?.forEach(s=>s.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(s=>this._$ET(s,this[s])),this._$EM()}updated(t){}firstUpdated(t){}};x.elementStyles=[],x.shadowRootOptions={mode:"open"},x[M("elementProperties")]=new Map,x[M("finalized")]=new Map,It?.({ReactiveElement:x}),(B.reactiveElementVersions??=[]).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Q=globalThis,ht=r=>r,j=Q.trustedTypes,ct=j?j.createPolicy("lit-html",{createHTML:r=>r}):void 0,bt="$lit$",m=`lit$${Math.random().toFixed(9).slice(2)}$`,_t="?"+m,Dt=`<${_t}>`,$=document,T=()=>$.createComment(""),C=r=>r===null||typeof r!="object"&&typeof r!="function",tt=Array.isArray,jt=r=>tt(r)||typeof r?.[Symbol.iterator]=="function",V=`[ 	
\f\r]`,k=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,lt=/-->/g,dt=/>/g,v=RegExp(`>|${V}(?:([^\\s"'>=/]+)(${V}*=${V}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),pt=/'/g,ut=/"/g,xt=/^(?:script|style|textarea|title)$/i,zt=r=>(t,...s)=>({_$litType$:r,strings:t,values:s}),E=zt(1),A=Symbol.for("lit-noChange"),u=Symbol.for("lit-nothing"),ft=new WeakMap,y=$.createTreeWalker($,129);function At(r,t){if(!tt(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return ct!==void 0?ct.createHTML(t):t}const Kt=(r,t)=>{const s=r.length-1,e=[];let i,o=t===2?"<svg>":t===3?"<math>":"",n=k;for(let h=0;h<s;h++){const a=r[h];let c,l,d=-1,p=0;for(;p<a.length&&(n.lastIndex=p,l=n.exec(a),l!==null);)p=n.lastIndex,n===k?l[1]==="!--"?n=lt:l[1]!==void 0?n=dt:l[2]!==void 0?(xt.test(l[2])&&(i=RegExp("</"+l[2],"g")),n=v):l[3]!==void 0&&(n=v):n===v?l[0]===">"?(n=i??k,d=-1):l[1]===void 0?d=-2:(d=n.lastIndex-l[2].length,c=l[1],n=l[3]===void 0?v:l[3]==='"'?ut:pt):n===ut||n===pt?n=v:n===lt||n===dt?n=k:(n=v,i=void 0);const f=n===v&&r[h+1].startsWith("/>")?" ":"";o+=n===k?a+Dt:d>=0?(e.push(c),a.slice(0,d)+bt+a.slice(d)+m+f):a+m+(d===-2?h:f)}return[At(r,o+(r[s]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),e]};class N{constructor({strings:t,_$litType$:s},e){let i;this.parts=[];let o=0,n=0;const h=t.length-1,a=this.parts,[c,l]=Kt(t,s);if(this.el=N.createElement(c,e),y.currentNode=this.el.content,s===2||s===3){const d=this.el.content.firstChild;d.replaceWith(...d.childNodes)}for(;(i=y.nextNode())!==null&&a.length<h;){if(i.nodeType===1){if(i.hasAttributes())for(const d of i.getAttributeNames())if(d.endsWith(bt)){const p=l[n++],f=i.getAttribute(d).split(m),b=/([.?@])?(.*)/.exec(p);a.push({type:1,index:o,name:b[2],strings:f,ctor:b[1]==="."?Bt:b[1]==="?"?Ft:b[1]==="@"?qt:F}),i.removeAttribute(d)}else d.startsWith(m)&&(a.push({type:6,index:o}),i.removeAttribute(d));if(xt.test(i.tagName)){const d=i.textContent.split(m),p=d.length-1;if(p>0){i.textContent=j?j.emptyScript:"";for(let f=0;f<p;f++)i.append(d[f],T()),y.nextNode(),a.push({type:2,index:++o});i.append(d[p],T())}}}else if(i.nodeType===8)if(i.data===_t)a.push({type:2,index:o});else{let d=-1;for(;(d=i.data.indexOf(m,d+1))!==-1;)a.push({type:7,index:o}),d+=m.length-1}o++}}static createElement(t,s){const e=$.createElement("template");return e.innerHTML=t,e}}function w(r,t,s=r,e){if(t===A)return t;let i=e!==void 0?s._$Co?.[e]:s._$Cl;const o=C(t)?void 0:t._$litDirective$;return i?.constructor!==o&&(i?._$AO?.(!1),o===void 0?i=void 0:(i=new o(r),i._$AT(r,s,e)),e!==void 0?(s._$Co??=[])[e]=i:s._$Cl=i),i!==void 0&&(t=w(r,i._$AS(r,t.values),i,e)),t}class Wt{constructor(t,s){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=s}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:s},parts:e}=this._$AD,i=(t?.creationScope??$).importNode(s,!0);y.currentNode=i;let o=y.nextNode(),n=0,h=0,a=e[0];for(;a!==void 0;){if(n===a.index){let c;a.type===2?c=new U(o,o.nextSibling,this,t):a.type===1?c=new a.ctor(o,a.name,a.strings,this,t):a.type===6&&(c=new Vt(o,this,t)),this._$AV.push(c),a=e[++h]}n!==a?.index&&(o=y.nextNode(),n++)}return y.currentNode=$,i}p(t){let s=0;for(const e of this._$AV)e!==void 0&&(e.strings!==void 0?(e._$AI(t,e,s),s+=e.strings.length-2):e._$AI(t[s])),s++}}class U{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,s,e,i){this.type=2,this._$AH=u,this._$AN=void 0,this._$AA=t,this._$AB=s,this._$AM=e,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const s=this._$AM;return s!==void 0&&t?.nodeType===11&&(t=s.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,s=this){t=w(this,t,s),C(t)?t===u||t==null||t===""?(this._$AH!==u&&this._$AR(),this._$AH=u):t!==this._$AH&&t!==A&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):jt(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==u&&C(this._$AH)?this._$AA.nextSibling.data=t:this.T($.createTextNode(t)),this._$AH=t}$(t){const{values:s,_$litType$:e}=t,i=typeof e=="number"?this._$AC(t):(e.el===void 0&&(e.el=N.createElement(At(e.h,e.h[0]),this.options)),e);if(this._$AH?._$AD===i)this._$AH.p(s);else{const o=new Wt(i,this),n=o.u(this.options);o.p(s),this.T(n),this._$AH=o}}_$AC(t){let s=ft.get(t.strings);return s===void 0&&ft.set(t.strings,s=new N(t)),s}k(t){tt(this._$AH)||(this._$AH=[],this._$AR());const s=this._$AH;let e,i=0;for(const o of t)i===s.length?s.push(e=new U(this.O(T()),this.O(T()),this,this.options)):e=s[i],e._$AI(o),i++;i<s.length&&(this._$AR(e&&e._$AB.nextSibling,i),s.length=i)}_$AR(t=this._$AA.nextSibling,s){for(this._$AP?.(!1,!0,s);t!==this._$AB;){const e=ht(t).nextSibling;ht(t).remove(),t=e}}setConnected(t){this._$AM===void 0&&(this._$Cv=t,this._$AP?.(t))}}class F{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,s,e,i,o){this.type=1,this._$AH=u,this._$AN=void 0,this.element=t,this.name=s,this._$AM=i,this.options=o,e.length>2||e[0]!==""||e[1]!==""?(this._$AH=Array(e.length-1).fill(new String),this.strings=e):this._$AH=u}_$AI(t,s=this,e,i){const o=this.strings;let n=!1;if(o===void 0)t=w(this,t,s,0),n=!C(t)||t!==this._$AH&&t!==A,n&&(this._$AH=t);else{const h=t;let a,c;for(t=o[0],a=0;a<o.length-1;a++)c=w(this,h[e+a],s,a),c===A&&(c=this._$AH[a]),n||=!C(c)||c!==this._$AH[a],c===u?t=u:t!==u&&(t+=(c??"")+o[a+1]),this._$AH[a]=c}n&&!i&&this.j(t)}j(t){t===u?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class Bt extends F{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===u?void 0:t}}class Ft extends F{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==u)}}class qt extends F{constructor(t,s,e,i,o){super(t,s,e,i,o),this.type=5}_$AI(t,s=this){if((t=w(this,t,s,0)??u)===A)return;const e=this._$AH,i=t===u&&e!==u||t.capture!==e.capture||t.once!==e.once||t.passive!==e.passive,o=t!==u&&(e===u||i);i&&this.element.removeEventListener(this.name,this,e),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class Vt{constructor(t,s,e){this.element=t,this.type=6,this._$AN=void 0,this._$AM=s,this.options=e}get _$AU(){return this._$AM._$AU}_$AI(t){w(this,t)}}const Xt=Q.litHtmlPolyfillSupport;Xt?.(N,U),(Q.litHtmlVersions??=[]).push("3.3.3");const Yt=(r,t,s)=>{const e=s?.renderBefore??t;let i=e._$litPart$;if(i===void 0){const o=s?.renderBefore??null;e._$litPart$=i=new U(t.insertBefore(T(),o),o,void 0,s??{})}return i._$AI(r),i};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const et=globalThis;class P extends x{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const s=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=Yt(s,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return A}}P._$litElement$=!0,P.finalized=!0,et.litElementHydrateSupport?.({LitElement:P});const Jt=et.litElementPolyfillSupport;Jt?.({LitElement:P});(et.litElementVersions??=[]).push("4.2.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Zt=r=>(t,s)=>{s!==void 0?s.addInitializer(()=>{customElements.define(r,t)}):customElements.define(r,t)};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Gt={attribute:!0,type:String,converter:D,reflect:!1,hasChanged:G},Qt=(r=Gt,t,s)=>{const{kind:e,metadata:i}=s;let o=globalThis.litPropertyMetadata.get(i);if(o===void 0&&globalThis.litPropertyMetadata.set(i,o=new Map),e==="setter"&&((r=Object.create(r)).wrapped=!0),o.set(s.name,r),e==="accessor"){const{name:n}=s;return{set(h){const a=t.get.call(this);t.set.call(this,h),this.requestUpdate(n,a,r,!0,h)},init(h){return h!==void 0&&this.C(n,void 0,r,h),h}}}if(e==="setter"){const{name:n}=s;return function(h){const a=this[n];t.call(this,h),this.requestUpdate(n,a,r,!0,h)}}throw Error("Unsupported decorator location: "+e)};function te(r){return(t,s)=>typeof s=="object"?Qt(r,t,s):((e,i,o)=>{const n=i.hasOwnProperty(o);return i.constructor.createProperty(o,e),n?Object.getOwnPropertyDescriptor(i,o):void 0})(r,t,s)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function q(r){return te({...r,state:!0,attribute:!1})}const Y=2,O=20,mt=0,vt=1,z=-2,K=2,I=1e-7,X=1e-10,S=1e-12;function ee(r){if(!r||!Array.isArray(r.keyframes)||!Array.isArray(r.controls))throw new Error("spec must contain keyframes and controls arrays");const{keyframes:t,controls:s}=r;if(t.length<Y||t.length>O)throw new Error(`keyframe count must be ${Y}..${O}, got ${t.length}`);if(s.length!==t.length-1)throw new Error(`expected ${t.length-1} control pairs, got ${s.length}`);for(const e of t){if(!Number.isFinite(e.t)||!Number.isInteger(e.t))throw new Error(`keyframe time must be an integer, got ${e.t}`);if(!Number.isFinite(e.v))throw new Error(`keyframe value must be finite, got ${e.v}`)}for(let e=1;e<t.length;e++)if(t[e].t<=t[e-1].t)throw new Error(`keyframe times must be strictly increasing: t[${e-1}]=${t[e-1].t}, t[${e}]=${t[e].t}`);for(let e=0;e<s.length;e++){const i=s[e];for(const[o,n,h,a]of[["x1",i.x1,mt,vt],["x2",i.x2,mt,vt],["y1",i.y1,z,K],["y2",i.y2,z,K]])if(!Number.isFinite(n)||n<h||n>a)throw new Error(`control ${o} of segment ${e} must be in [${h}, ${a}], got ${n}`)}}function W(r,t,s){const e=1-s;return 3*e*e*s*r+3*e*s*s*t+s*s*s}function se(r,t){const s=3*(r-t)+1,e=2*(t-2*r),i=r,o=[];if(Math.abs(s)<S)Math.abs(e)>S&&o.push(-i/e);else{const h=e*e-4*s*i;if(h>=0){const a=Math.sqrt(h);o.push((-e-a)/(2*s),(-e+a)/(2*s))}}const n=o.filter(h=>h>S&&h<1-S).sort((h,a)=>h-a);return n.filter((h,a)=>a===0||h-n[a-1]>S)}function wt(r,t,s){let e=r(t);for(let i=0;i<80;i++){const o=(t+s)/2,n=r(o);if(n===0)return o;e*n<0?s=o:(t=o,e=n)}return(t+s)/2}function ie(r,t,s){const e=Math.min(1,Math.max(0,s));return e===0?0:e===1?1:wt(i=>W(r,t,i)-e,0,1)}function re(r,t,s){const e=n=>W(r,t,n)-s,i=[0,...se(r,t),1],o=[];for(let n=0;n<i.length-1;n++){const h=i[n],a=i[n+1],c=e(h);if(Math.abs(c)<=X){o.push(h);continue}const l=e(a);Math.abs(l)<=X||c*l<0&&o.push(wt(e,h,a))}return Math.abs(e(1))<=X&&o.push(1),o.sort((n,h)=>n-h),o.filter((n,h)=>h===0||n-o[h-1]>I)}class yt{constructor(t){ee(t),this.spec={keyframes:t.keyframes.map(s=>({...s})),controls:t.controls.map(s=>({...s}))}}get keyframes(){return this.spec.keyframes}get controls(){return this.spec.controls}get t0(){return this.spec.keyframes[0].t}get t1(){return this.spec.keyframes[this.spec.keyframes.length-1].t}segmentIndex(t){const s=this.spec.keyframes,e=Math.min(Math.max(t,this.t0),this.t1);let i=0,o=s.length-1;for(;i<o;){const n=i+o>>1;s[n+1].t<e?i=n+1:o=n}return i}evaluate(t){const s=this.spec.keyframes;if(t<=this.t0)return s[0].v;if(t>=this.t1)return s[s.length-1].v;const e=this.segmentIndex(t),i=s[e],o=s[e+1],n=this.spec.controls[e],h=ie(n.x1,n.x2,(t-i.t)/(o.t-i.t));return i.v+W(n.y1,n.y2,h)*(o.v-i.v)}solveThreshold(t){const s=this.spec.keyframes,e=[],i=[];for(let h=0;h<s.length-1;h++){const a=s[h],c=s[h+1],l=c.v-a.v;if(l===0){if(a.v===t){const f=i[i.length-1];f&&f[1]===a.t?f[1]=c.t:i.push([a.t,c.t])}continue}const d=(t-a.v)/l,p=this.spec.controls[h];for(const f of re(p.y1,p.y2,d))e.push(a.t+W(p.x1,p.x2,f)*(c.t-a.t))}e.sort((h,a)=>h-a);const o=[];for(const h of e){const a=o[o.length-1];a===void 0||h-a>I?o.push(h):o[o.length-1]=(a+h)/2}return{times:o.filter(h=>!i.some(([a,c])=>h>=a-I&&h<=c+I)),intervals:i}}}class oe{constructor(t){this.revision=0,this.thresholdCache=new Map,this.listeners=new Set,this.curve=new yt(t)}get current(){return this.curve}get currentRevision(){return this.revision}get spec(){return this.curve.spec}evaluate(t){return this.curve.evaluate(t)}solveThreshold(t){const s=this.thresholdCache.get(t);if(s)return s;const e=this.curve.solveThreshold(t);return this.thresholdCache.set(t,e),e}sample(t){const{t0:s,t1:e}=this.curve,i=[];for(let o=0;o<=t;o++){const n=s+(e-s)*o/t;i.push({t:n,v:this.curve.evaluate(n)})}return i}update(t){this.curve=new yt(t),this.revision++,this.thresholdCache.clear(),this.emit()}updateKeyframe(t,s){const e=this.curve.spec,i=e.keyframes.map((o,n)=>n===t?{...s}:{...o});this.update({keyframes:i,controls:e.controls.map(o=>({...o}))})}updateControl(t,s){const e=this.curve.spec,i=e.controls.map((o,n)=>n===t?{...s}:{...o});this.update({keyframes:e.keyframes.map(o=>({...o})),controls:i})}insertKeyframe(t){const s=this.curve.spec,e=[...s.keyframes.map(n=>({...n})),{...t}].sort((n,h)=>n.t-h.t),i=e.findIndex(n=>n.t===t.t),o=s.controls.map(n=>({...n}));o.splice(i,0,ne()),this.update({keyframes:e,controls:o})}removeKeyframe(t){const s=this.curve.spec,e=s.keyframes.filter((n,h)=>h!==t).map(n=>({...n})),i=Math.min(t,s.controls.length-1),o=s.controls.filter((n,h)=>h!==i).map(n=>({...n}));this.update({keyframes:e,controls:o})}subscribe(t){return this.listeners.add(t),()=>this.listeners.delete(t)}emit(){for(const t of this.listeners)t()}}function ne(){return{x1:1/3,y1:1/3,x2:2/3,y2:2/3}}var ae=Object.defineProperty,he=Object.getOwnPropertyDescriptor,R=(r,t,s,e)=>{for(var i=e>1?void 0:e?he(t,s):t,o=r.length-1,n;o>=0;o--)(n=r[o])&&(i=(e?n(t,s,i):n(i))||i);return e&&i&&ae(t,s,i),i};const _={left:52,right:20,top:18,bottom:30};function $t(){return{keyframes:[{t:0,v:0},{t:6,v:1},{t:14,v:.2}],controls:[{x1:.25,y1:1.6,x2:.6,y2:1},{x1:.4,y1:0,x2:.7,y2:-.8}]}}let g=class extends P{constructor(){super(...arguments),this.store=new oe($t()),this.cursorT=3,this.threshold=.5,this.exportText="",this.drag=null,this.view=null}connectedCallback(){super.connectedCallback(),this.unsubscribe=this.store.subscribe(()=>this.requestUpdate())}disconnectedCallback(){this.unsubscribe?.(),super.disconnectedCallback()}firstUpdated(){this.canvas=this.renderRoot.querySelector("canvas"),this.ctx=this.canvas.getContext("2d"),typeof ResizeObserver<"u"&&new ResizeObserver(()=>this.draw()).observe(this.canvas),this.draw()}updated(){this.draw()}computeView(){const r=window.devicePixelRatio||1,t=this.canvas.clientWidth,s=this.canvas.clientHeight;(this.canvas.width!==t*r||this.canvas.height!==s*r)&&(this.canvas.width=t*r,this.canvas.height=s*r),this.ctx.setTransform(r,0,0,r,0,0);const e=this.store.spec,i=e.keyframes[0].t,o=e.keyframes[e.keyframes.length-1].t;let n=1/0,h=-1/0;for(const c of e.keyframes)n=Math.min(n,c.v),h=Math.max(h,c.v);for(let c=0;c<e.controls.length;c++){const l=e.keyframes[c],d=e.keyframes[c+1],p=e.controls[c];n=Math.min(n,l.v+p.y1*(d.v-l.v),l.v+p.y2*(d.v-l.v)),h=Math.max(h,l.v+p.y1*(d.v-l.v),l.v+p.y2*(d.v-l.v))}for(const c of this.store.sample(200))n=Math.min(n,c.v),h=Math.max(h,c.v);n=Math.min(n,this.threshold),h=Math.max(h,this.threshold);const a=Math.max(.2,(h-n)*.12);return{left:_.left,top:_.top,width:t-_.left-_.right,height:s-_.top-_.bottom,t0:i,t1:o,vMin:n-a,vMax:h+a}}xOf(r){const t=this.view;return t.left+(r-t.t0)/(t.t1-t.t0)*t.width}yOf(r){const t=this.view;return t.top+t.height-(r-t.vMin)/(t.vMax-t.vMin)*t.height}timeAt(r){const t=this.view;return t.t0+(r-t.left)/t.width*(t.t1-t.t0)}valueAt(r){const t=this.view;return t.vMin+(t.top+t.height-r)/t.height*(t.vMax-t.vMin)}draw(){if(!this.ctx)return;this.view=this.computeView();const r=this.view,t=this.ctx,s=this.store.spec;t.clearRect(0,0,this.canvas.clientWidth,this.canvas.clientHeight),t.strokeStyle="#1d2330",t.fillStyle="#5b6b8c",t.font="10px ui-monospace, monospace",t.lineWidth=1;for(let a=r.t0;a<=r.t1;a++){const c=this.xOf(a);t.beginPath(),t.moveTo(c,r.top),t.lineTo(c,r.top+r.height),t.stroke(),t.fillText(String(a),c-3,r.top+r.height+14)}const e=6;for(let a=0;a<=e;a++){const c=r.vMin+(r.vMax-r.vMin)*a/e,l=this.yOf(c);t.beginPath(),t.moveTo(r.left,l),t.lineTo(r.left+r.width,l),t.stroke(),t.fillText(c.toFixed(2),6,l+3)}const i=this.store.solveThreshold(this.threshold);t.strokeStyle="#e0a33e",t.lineWidth=5;for(const[a,c]of i.intervals)t.beginPath(),t.moveTo(this.xOf(a),this.yOf(this.threshold)),t.lineTo(this.xOf(c),this.yOf(this.threshold)),t.stroke();t.strokeStyle="#5ec1ff",t.lineWidth=2,t.beginPath();for(let a=0;a<=r.width;a++){const c=this.timeAt(r.left+a),l=this.yOf(this.store.evaluate(c));a===0?t.moveTo(r.left,l):t.lineTo(r.left+a,l)}t.stroke(),t.lineWidth=1;for(let a=0;a<s.controls.length;a++){const c=s.keyframes[a],l=s.keyframes[a+1],d=s.controls[a],p=l.t-c.t,f=l.v-c.v,b=[[c.t+d.x1*p,c.v+d.y1*f],[c.t+d.x2*p,c.v+d.y2*f]],kt=[[c.t,c.v],[l.t,l.v]];for(let H=0;H<2;H++){const[st,it]=b[H],[Et,St]=kt[H];t.strokeStyle="#7a5fb0",t.beginPath(),t.moveTo(this.xOf(Et),this.yOf(St)),t.lineTo(this.xOf(st),this.yOf(it)),t.stroke(),t.fillStyle="#b08fe8",t.beginPath(),t.arc(this.xOf(st),this.yOf(it),5,0,Math.PI*2),t.fill()}}for(const a of s.keyframes)t.fillStyle="#ffd76a",t.beginPath(),t.arc(this.xOf(a.t),this.yOf(a.v),6,0,Math.PI*2),t.fill(),t.strokeStyle="#14171d",t.stroke();const o=this.yOf(this.threshold);t.strokeStyle="#e0a33e",t.setLineDash([6,4]),t.lineWidth=1.5,t.beginPath(),t.moveTo(r.left,o),t.lineTo(r.left+r.width,o),t.stroke(),t.setLineDash([]),t.fillStyle="#e0a33e";for(const a of i.times)t.beginPath(),t.arc(this.xOf(a),o,4.5,0,Math.PI*2),t.fill();const n=this.xOf(this.cursorT),h=this.store.evaluate(this.cursorT);t.strokeStyle="#7ee787",t.lineWidth=1.5,t.beginPath(),t.moveTo(n,r.top),t.lineTo(n,r.top+r.height),t.stroke(),t.fillStyle="#7ee787",t.beginPath(),t.arc(n,this.yOf(h),5,0,Math.PI*2),t.fill(),t.fillText(`t=${this.cursorT.toFixed(3)}  v=${h.toFixed(4)}`,Math.min(n+8,r.left+r.width-130),r.top+12)}canvasPos(r){const t=this.canvas.getBoundingClientRect();return[r.clientX-t.left,r.clientY-t.top]}hitTest(r,t){const s=this.store.spec;for(let e=0;e<s.keyframes.length;e++){const i=s.keyframes[e];if(Math.hypot(r-this.xOf(i.t),t-this.yOf(i.v))<=9)return{kind:"key",index:e}}for(let e=0;e<s.controls.length;e++){const i=s.keyframes[e],o=s.keyframes[e+1],n=s.controls[e],h=o.t-i.t,a=o.v-i.v,c=[[i.t+n.x1*h,i.v+n.y1*a,1],[i.t+n.x2*h,i.v+n.y2*a,2]];for(const[l,d,p]of c)if(Math.hypot(r-this.xOf(l),t-this.yOf(d))<=8)return{kind:"cp",segment:e,which:p}}return Math.abs(r-this.xOf(this.cursorT))<=6?{kind:"cursor"}:Math.abs(t-this.yOf(this.threshold))<=6?{kind:"threshold"}:null}onPointerDown(r){const[t,s]=this.canvasPos(r),e=this.hitTest(t,s);if(e?.kind==="key"&&r.altKey){this.store.spec.keyframes.length>Y&&this.store.removeKeyframe(e.index);return}this.drag=e??{kind:"cursor"},this.drag.kind==="cursor"&&(this.cursorT=this.clampTime(this.timeAt(t))),this.canvas.setPointerCapture(r.pointerId)}onPointerMove(r){if(!this.drag)return;const[t,s]=this.canvasPos(r),e=this.store.spec,i=this.drag;if(i.kind==="key"){const o=e.keyframes[i.index-1],n=e.keyframes[i.index+1],h=o?o.t+1:-1/0,a=n?n.t-1:1/0,c=Math.min(a,Math.max(h,Math.round(this.timeAt(t))));this.store.updateKeyframe(i.index,{t:c,v:this.valueAt(s)})}else if(i.kind==="cp"){const o=i.segment,n=e.keyframes[o],h=e.keyframes[o+1],a=h.t-n.t,c=h.v-n.v,l=Math.min(1,Math.max(0,(this.timeAt(t)-n.t)/a)),d=c===0?0:Math.min(K,Math.max(z,(this.valueAt(s)-n.v)/c)),p={...e.controls[o]};i.which===1?(p.x1=l,p.y1=d):(p.x2=l,p.y2=d),this.store.updateControl(o,p)}else i.kind==="cursor"?this.cursorT=this.clampTime(this.timeAt(t)):this.threshold=this.valueAt(s)}onPointerUp(){this.drag=null}onDoubleClick(r){const[t,s]=this.canvasPos(r);if(this.hitTest(t,s))return;const e=this.store.spec;if(e.keyframes.length>=O)return;const i=Math.round(this.timeAt(t));i<=e.keyframes[0].t||i>=e.keyframes[e.keyframes.length-1].t||e.keyframes.some(o=>o.t===i)||this.store.insertKeyframe({t:i,v:this.store.evaluate(i)})}clampTime(r){const t=this.store.spec;return Math.min(t.keyframes[t.keyframes.length-1].t,Math.max(t.keyframes[0].t,r))}setKeyframeT(r,t){const s=Number(t.target.value);if(!Number.isInteger(s))return;const e=this.store.spec,i=e.keyframes[r-1],o=e.keyframes[r+1];i&&s<=i.t||o&&s>=o.t||this.store.updateKeyframe(r,{t:s,v:e.keyframes[r].v})}setKeyframeV(r,t){const s=Number(t.target.value);Number.isFinite(s)&&this.store.updateKeyframe(r,{t:this.store.spec.keyframes[r].t,v:s})}setControl(r,t,s){const e=Number(s.target.value);if(!Number.isFinite(e))return;const i={...this.store.spec.controls[r],[t]:e};try{this.store.updateControl(r,i)}catch{}}addKeyframe(){const r=this.store.spec;if(r.keyframes.length>=O)return;let t=0,s=-1;for(let i=0;i<r.keyframes.length-1;i++){const o=r.keyframes[i+1].t-r.keyframes[i].t;o>s&&(s=o,t=i)}if(s<2)return;const e=r.keyframes[t].t+Math.floor(s/2);this.store.insertKeyframe({t:e,v:this.store.evaluate(e)})}reset(){this.store.update($t()),this.cursorT=3,this.threshold=.5,this.exportText=""}doExport(){const r=this.store.solveThreshold(this.threshold),t={revision:this.store.currentRevision,spec:this.store.spec,cursor:{t:this.cursorT,v:this.store.evaluate(this.cursorT)},threshold:{value:this.threshold,times:r.times,intervals:r.intervals},samples:this.store.sample(200)};this.exportText=JSON.stringify(t,null,1)}download(){this.exportText||this.doExport();const r=new Blob([this.exportText],{type:"application/json"}),t=document.createElement("a");t.href=URL.createObjectURL(r),t.download="easing-export.json",t.click(),URL.revokeObjectURL(t.href)}render(){const r=this.store.spec,t=this.store.solveThreshold(this.threshold),s=this.store.evaluate(this.cursorT),e=i=>Number(i.toFixed(6)).toString();return E`
      <div class="layout">
        <div class="canvas-wrap">
          <canvas
            @pointerdown=${this.onPointerDown}
            @pointermove=${this.onPointerMove}
            @pointerup=${this.onPointerUp}
            @pointerleave=${this.onPointerUp}
            @dblclick=${this.onDoubleClick}
          ></canvas>
          <div class="hint" style="color:#6b7a95;font-size:12px;margin-top:6px">
            拖动关键帧 / 控制柄 / 绿线游标 / 橙色阈值线；双击空白处在曲线上添加关键帧；Alt+点击关键帧删除。
          </div>
        </div>
        <div class="panel">
          <fieldset>
            <legend>游标 / 阈值</legend>
            <label>t
              <input type="number" step="0.1" .value=${String(this.cursorT)}
                @change=${i=>{this.cursorT=this.clampTime(Number(i.target.value))}} />
            </label>
            <span class="readout">v=${s.toFixed(6)}</span><br />
            <label>阈值
              <input type="number" step="0.05" .value=${String(this.threshold)}
                @change=${i=>{this.threshold=Number(i.target.value)}} />
            </label>
            <div class="readout">
              穿越时刻: [${t.times.map(e).join(", ")}]
              ${t.intervals.length?E`<br />恒等区间: ${t.intervals.map(([i,o])=>`[${e(i)}, ${e(o)}]`).join(", ")}`:""}
            </div>
          </fieldset>
          <fieldset>
            <legend>关键帧 (${r.keyframes.length}/${O})</legend>
            ${r.keyframes.map((i,o)=>E`
                <div class="kf-row">
                  <span class="tag">#${o}</span>
                  <label>t
                    <input type="number" step="1" .value=${String(i.t)}
                      @change=${n=>this.setKeyframeT(o,n)} />
                  </label>
                  <label>v
                    <input type="number" step="0.01" .value=${String(i.v)}
                      @change=${n=>this.setKeyframeV(o,n)} />
                  </label>
                </div>
              `)}
            <button @click=${this.addKeyframe}>添加关键帧</button>
            <button @click=${this.reset}>重置</button>
          </fieldset>
          <fieldset>
            <legend>控制点 (x∈[0,1], y∈[${z},${K}])</legend>
            ${r.controls.map((i,o)=>E`
                <div class="cp-row">
                  <span class="tag">段 ${o}</span>
                  ${["x1","y1","x2","y2"].map(n=>E`
                      <label>${n}
                        <input type="number" step="0.01" .value=${i[n].toFixed(3)}
                          @change=${h=>this.setControl(o,n,h)} />
                      </label>
                    `)}
                </div>
              `)}
          </fieldset>
          <fieldset>
            <legend>导出 (与画布/游标同一求值结果, rev ${this.store.currentRevision})</legend>
            <button @click=${this.doExport}>生成 JSON</button>
            <button @click=${this.download}>下载</button>
            <textarea readonly .value=${this.exportText}></textarea>
          </fieldset>
        </div>
      </div>
    `}};g.styles=Pt`
    :host {
      display: block;
      font-family: 'Segoe UI', system-ui, sans-serif;
      color: #d7dde8;
      background: #14171d;
      border-radius: 10px;
      padding: 16px;
    }
    .layout {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .canvas-wrap {
      flex: 1 1 520px;
      min-width: 320px;
    }
    canvas {
      width: 100%;
      height: 440px;
      display: block;
      background: #0d1015;
      border: 1px solid #2a3040;
      border-radius: 8px;
      cursor: crosshair;
      touch-action: none;
    }
    .panel {
      flex: 0 1 300px;
      min-width: 260px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 13px;
    }
    fieldset {
      border: 1px solid #2a3040;
      border-radius: 8px;
      padding: 8px 10px;
      margin: 0;
    }
    legend {
      padding: 0 6px;
      color: #8fa3c8;
    }
    label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin: 2px 8px 2px 0;
    }
    input[type='number'] {
      width: 64px;
      background: #0d1015;
      color: #d7dde8;
      border: 1px solid #2a3040;
      border-radius: 4px;
      padding: 2px 4px;
    }
    button {
      background: #22314f;
      color: #d7dde8;
      border: 1px solid #38507e;
      border-radius: 6px;
      padding: 4px 10px;
      cursor: pointer;
      margin-right: 6px;
    }
    button:hover {
      background: #2c4067;
    }
    .readout {
      font-family: ui-monospace, monospace;
      font-size: 12px;
      color: #9fd3a8;
      word-break: break-all;
      white-space: pre-wrap;
    }
    textarea {
      width: 100%;
      height: 120px;
      box-sizing: border-box;
      background: #0d1015;
      color: #9fd3a8;
      border: 1px solid #2a3040;
      border-radius: 6px;
      font-family: ui-monospace, monospace;
      font-size: 11px;
    }
    .hint {
      color: #6b7a95;
    }
    .kf-row,
    .cp-row {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 2px 0;
      flex-wrap: wrap;
    }
    .tag {
      color: #8fa3c8;
      min-width: 44px;
      display: inline-block;
    }
  `;R([q()],g.prototype,"store",2);R([q()],g.prototype,"cursorT",2);R([q()],g.prototype,"threshold",2);R([q()],g.prototype,"exportText",2);g=R([Zt("easing-editor")],g);
