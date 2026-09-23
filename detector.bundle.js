/* AI Детектор — сборка одним файлом. Собрано tools/build-bundle.js;
 * править надо исходники в js/, а не этот файл.
 *
 * Командная строка:  node detector.bundle.js файл.docx strict
 * Как модуль в Node: const D = require('./detector.bundle.js');
 *                    D.checkText(текст).summary
 *                    D.checkDocx(буфер).then(r => r.summary)
 * В браузере:        <script src="detector.bundle.js"></script> -> AIDetectorBundle
 *
 * Всё считается на месте: ни сети, ни установки, ни внешних библиотек.
 */
(function (globalRoot, realModule) {
  'use strict';
  var ns = {};
  (function (self, module, window, global, exports, define) {
/*!

JSZip v3.10.1 - A JavaScript class for generating and reading zip files
<http://stuartk.com/jszip>

(c) 2009-2016 Stuart Knightley <stuart [at] stuartk.com>
Dual licenced under the MIT license or GPLv3. See https://raw.github.com/Stuk/jszip/main/LICENSE.markdown.

JSZip uses the library pako released under the MIT license :
https://github.com/nodeca/pako/blob/main/LICENSE
*/

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{("undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this).JSZip=e()}}(function(){return function s(a,o,h){function u(r,e){if(!o[r]){if(!a[r]){var t="function"==typeof require&&require;if(!e&&t)return t(r,!0);if(l)return l(r,!0);var n=new Error("Cannot find module '"+r+"'");throw n.code="MODULE_NOT_FOUND",n}var i=o[r]={exports:{}};a[r][0].call(i.exports,function(e){var t=a[r][1][e];return u(t||e)},i,i.exports,s,a,o,h)}return o[r].exports}for(var l="function"==typeof require&&require,e=0;e<h.length;e++)u(h[e]);return u}({1:[function(e,t,r){"use strict";var d=e("./utils"),c=e("./support"),p="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";r.encode=function(e){for(var t,r,n,i,s,a,o,h=[],u=0,l=e.length,f=l,c="string"!==d.getTypeOf(e);u<e.length;)f=l-u,n=c?(t=e[u++],r=u<l?e[u++]:0,u<l?e[u++]:0):(t=e.charCodeAt(u++),r=u<l?e.charCodeAt(u++):0,u<l?e.charCodeAt(u++):0),i=t>>2,s=(3&t)<<4|r>>4,a=1<f?(15&r)<<2|n>>6:64,o=2<f?63&n:64,h.push(p.charAt(i)+p.charAt(s)+p.charAt(a)+p.charAt(o));return h.join("")},r.decode=function(e){var t,r,n,i,s,a,o=0,h=0,u="data:";if(e.substr(0,u.length)===u)throw new Error("Invalid base64 input, it looks like a data url.");var l,f=3*(e=e.replace(/[^A-Za-z0-9+/=]/g,"")).length/4;if(e.charAt(e.length-1)===p.charAt(64)&&f--,e.charAt(e.length-2)===p.charAt(64)&&f--,f%1!=0)throw new Error("Invalid base64 input, bad content length.");for(l=c.uint8array?new Uint8Array(0|f):new Array(0|f);o<e.length;)t=p.indexOf(e.charAt(o++))<<2|(i=p.indexOf(e.charAt(o++)))>>4,r=(15&i)<<4|(s=p.indexOf(e.charAt(o++)))>>2,n=(3&s)<<6|(a=p.indexOf(e.charAt(o++))),l[h++]=t,64!==s&&(l[h++]=r),64!==a&&(l[h++]=n);return l}},{"./support":30,"./utils":32}],2:[function(e,t,r){"use strict";var n=e("./external"),i=e("./stream/DataWorker"),s=e("./stream/Crc32Probe"),a=e("./stream/DataLengthProbe");function o(e,t,r,n,i){this.compressedSize=e,this.uncompressedSize=t,this.crc32=r,this.compression=n,this.compressedContent=i}o.prototype={getContentWorker:function(){var e=new i(n.Promise.resolve(this.compressedContent)).pipe(this.compression.uncompressWorker()).pipe(new a("data_length")),t=this;return e.on("end",function(){if(this.streamInfo.data_length!==t.uncompressedSize)throw new Error("Bug : uncompressed data size mismatch")}),e},getCompressedWorker:function(){return new i(n.Promise.resolve(this.compressedContent)).withStreamInfo("compressedSize",this.compressedSize).withStreamInfo("uncompressedSize",this.uncompressedSize).withStreamInfo("crc32",this.crc32).withStreamInfo("compression",this.compression)}},o.createWorkerFrom=function(e,t,r){return e.pipe(new s).pipe(new a("uncompressedSize")).pipe(t.compressWorker(r)).pipe(new a("compressedSize")).withStreamInfo("compression",t)},t.exports=o},{"./external":6,"./stream/Crc32Probe":25,"./stream/DataLengthProbe":26,"./stream/DataWorker":27}],3:[function(e,t,r){"use strict";var n=e("./stream/GenericWorker");r.STORE={magic:"\0\0",compressWorker:function(){return new n("STORE compression")},uncompressWorker:function(){return new n("STORE decompression")}},r.DEFLATE=e("./flate")},{"./flate":7,"./stream/GenericWorker":28}],4:[function(e,t,r){"use strict";var n=e("./utils");var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t){return void 0!==e&&e.length?"string"!==n.getTypeOf(e)?function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}(0|t,e,e.length,0):function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t.charCodeAt(a))];return-1^e}(0|t,e,e.length,0):0}},{"./utils":32}],5:[function(e,t,r){"use strict";r.base64=!1,r.binary=!1,r.dir=!1,r.createFolders=!0,r.date=null,r.compression=null,r.compressionOptions=null,r.comment=null,r.unixPermissions=null,r.dosPermissions=null},{}],6:[function(e,t,r){"use strict";var n=null;n="undefined"!=typeof Promise?Promise:e("lie"),t.exports={Promise:n}},{lie:37}],7:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Uint32Array,i=e("pako"),s=e("./utils"),a=e("./stream/GenericWorker"),o=n?"uint8array":"array";function h(e,t){a.call(this,"FlateWorker/"+e),this._pako=null,this._pakoAction=e,this._pakoOptions=t,this.meta={}}r.magic="\b\0",s.inherits(h,a),h.prototype.processChunk=function(e){this.meta=e.meta,null===this._pako&&this._createPako(),this._pako.push(s.transformTo(o,e.data),!1)},h.prototype.flush=function(){a.prototype.flush.call(this),null===this._pako&&this._createPako(),this._pako.push([],!0)},h.prototype.cleanUp=function(){a.prototype.cleanUp.call(this),this._pako=null},h.prototype._createPako=function(){this._pako=new i[this._pakoAction]({raw:!0,level:this._pakoOptions.level||-1});var t=this;this._pako.onData=function(e){t.push({data:e,meta:t.meta})}},r.compressWorker=function(e){return new h("Deflate",e)},r.uncompressWorker=function(){return new h("Inflate",{})}},{"./stream/GenericWorker":28,"./utils":32,pako:38}],8:[function(e,t,r){"use strict";function A(e,t){var r,n="";for(r=0;r<t;r++)n+=String.fromCharCode(255&e),e>>>=8;return n}function n(e,t,r,n,i,s){var a,o,h=e.file,u=e.compression,l=s!==O.utf8encode,f=I.transformTo("string",s(h.name)),c=I.transformTo("string",O.utf8encode(h.name)),d=h.comment,p=I.transformTo("string",s(d)),m=I.transformTo("string",O.utf8encode(d)),_=c.length!==h.name.length,g=m.length!==d.length,b="",v="",y="",w=h.dir,k=h.date,x={crc32:0,compressedSize:0,uncompressedSize:0};t&&!r||(x.crc32=e.crc32,x.compressedSize=e.compressedSize,x.uncompressedSize=e.uncompressedSize);var S=0;t&&(S|=8),l||!_&&!g||(S|=2048);var z=0,C=0;w&&(z|=16),"UNIX"===i?(C=798,z|=function(e,t){var r=e;return e||(r=t?16893:33204),(65535&r)<<16}(h.unixPermissions,w)):(C=20,z|=function(e){return 63&(e||0)}(h.dosPermissions)),a=k.getUTCHours(),a<<=6,a|=k.getUTCMinutes(),a<<=5,a|=k.getUTCSeconds()/2,o=k.getUTCFullYear()-1980,o<<=4,o|=k.getUTCMonth()+1,o<<=5,o|=k.getUTCDate(),_&&(v=A(1,1)+A(B(f),4)+c,b+="up"+A(v.length,2)+v),g&&(y=A(1,1)+A(B(p),4)+m,b+="uc"+A(y.length,2)+y);var E="";return E+="\n\0",E+=A(S,2),E+=u.magic,E+=A(a,2),E+=A(o,2),E+=A(x.crc32,4),E+=A(x.compressedSize,4),E+=A(x.uncompressedSize,4),E+=A(f.length,2),E+=A(b.length,2),{fileRecord:R.LOCAL_FILE_HEADER+E+f+b,dirRecord:R.CENTRAL_FILE_HEADER+A(C,2)+E+A(p.length,2)+"\0\0\0\0"+A(z,4)+A(n,4)+f+b+p}}var I=e("../utils"),i=e("../stream/GenericWorker"),O=e("../utf8"),B=e("../crc32"),R=e("../signature");function s(e,t,r,n){i.call(this,"ZipFileWorker"),this.bytesWritten=0,this.zipComment=t,this.zipPlatform=r,this.encodeFileName=n,this.streamFiles=e,this.accumulate=!1,this.contentBuffer=[],this.dirRecords=[],this.currentSourceOffset=0,this.entriesCount=0,this.currentFile=null,this._sources=[]}I.inherits(s,i),s.prototype.push=function(e){var t=e.meta.percent||0,r=this.entriesCount,n=this._sources.length;this.accumulate?this.contentBuffer.push(e):(this.bytesWritten+=e.data.length,i.prototype.push.call(this,{data:e.data,meta:{currentFile:this.currentFile,percent:r?(t+100*(r-n-1))/r:100}}))},s.prototype.openedSource=function(e){this.currentSourceOffset=this.bytesWritten,this.currentFile=e.file.name;var t=this.streamFiles&&!e.file.dir;if(t){var r=n(e,t,!1,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);this.push({data:r.fileRecord,meta:{percent:0}})}else this.accumulate=!0},s.prototype.closedSource=function(e){this.accumulate=!1;var t=this.streamFiles&&!e.file.dir,r=n(e,t,!0,this.currentSourceOffset,this.zipPlatform,this.encodeFileName);if(this.dirRecords.push(r.dirRecord),t)this.push({data:function(e){return R.DATA_DESCRIPTOR+A(e.crc32,4)+A(e.compressedSize,4)+A(e.uncompressedSize,4)}(e),meta:{percent:100}});else for(this.push({data:r.fileRecord,meta:{percent:0}});this.contentBuffer.length;)this.push(this.contentBuffer.shift());this.currentFile=null},s.prototype.flush=function(){for(var e=this.bytesWritten,t=0;t<this.dirRecords.length;t++)this.push({data:this.dirRecords[t],meta:{percent:100}});var r=this.bytesWritten-e,n=function(e,t,r,n,i){var s=I.transformTo("string",i(n));return R.CENTRAL_DIRECTORY_END+"\0\0\0\0"+A(e,2)+A(e,2)+A(t,4)+A(r,4)+A(s.length,2)+s}(this.dirRecords.length,r,e,this.zipComment,this.encodeFileName);this.push({data:n,meta:{percent:100}})},s.prototype.prepareNextSource=function(){this.previous=this._sources.shift(),this.openedSource(this.previous.streamInfo),this.isPaused?this.previous.pause():this.previous.resume()},s.prototype.registerPrevious=function(e){this._sources.push(e);var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.closedSource(t.previous.streamInfo),t._sources.length?t.prepareNextSource():t.end()}),e.on("error",function(e){t.error(e)}),this},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this.previous&&this._sources.length?(this.prepareNextSource(),!0):this.previous||this._sources.length||this.generatedError?void 0:(this.end(),!0))},s.prototype.error=function(e){var t=this._sources;if(!i.prototype.error.call(this,e))return!1;for(var r=0;r<t.length;r++)try{t[r].error(e)}catch(e){}return!0},s.prototype.lock=function(){i.prototype.lock.call(this);for(var e=this._sources,t=0;t<e.length;t++)e[t].lock()},t.exports=s},{"../crc32":4,"../signature":23,"../stream/GenericWorker":28,"../utf8":31,"../utils":32}],9:[function(e,t,r){"use strict";var u=e("../compressions"),n=e("./ZipFileWorker");r.generateWorker=function(e,a,t){var o=new n(a.streamFiles,t,a.platform,a.encodeFileName),h=0;try{e.forEach(function(e,t){h++;var r=function(e,t){var r=e||t,n=u[r];if(!n)throw new Error(r+" is not a valid compression method !");return n}(t.options.compression,a.compression),n=t.options.compressionOptions||a.compressionOptions||{},i=t.dir,s=t.date;t._compressWorker(r,n).withStreamInfo("file",{name:e,dir:i,date:s,comment:t.comment||"",unixPermissions:t.unixPermissions,dosPermissions:t.dosPermissions}).pipe(o)}),o.entriesCount=h}catch(e){o.error(e)}return o}},{"../compressions":3,"./ZipFileWorker":8}],10:[function(e,t,r){"use strict";function n(){if(!(this instanceof n))return new n;if(arguments.length)throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");this.files=Object.create(null),this.comment=null,this.root="",this.clone=function(){var e=new n;for(var t in this)"function"!=typeof this[t]&&(e[t]=this[t]);return e}}(n.prototype=e("./object")).loadAsync=e("./load"),n.support=e("./support"),n.defaults=e("./defaults"),n.version="3.10.1",n.loadAsync=function(e,t){return(new n).loadAsync(e,t)},n.external=e("./external"),t.exports=n},{"./defaults":5,"./external":6,"./load":11,"./object":15,"./support":30}],11:[function(e,t,r){"use strict";var u=e("./utils"),i=e("./external"),n=e("./utf8"),s=e("./zipEntries"),a=e("./stream/Crc32Probe"),l=e("./nodejsUtils");function f(n){return new i.Promise(function(e,t){var r=n.decompressed.getContentWorker().pipe(new a);r.on("error",function(e){t(e)}).on("end",function(){r.streamInfo.crc32!==n.decompressed.crc32?t(new Error("Corrupted zip : CRC32 mismatch")):e()}).resume()})}t.exports=function(e,o){var h=this;return o=u.extend(o||{},{base64:!1,checkCRC32:!1,optimizedBinaryString:!1,createFolders:!1,decodeFileName:n.utf8decode}),l.isNode&&l.isStream(e)?i.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file.")):u.prepareContent("the loaded zip file",e,!0,o.optimizedBinaryString,o.base64).then(function(e){var t=new s(o);return t.load(e),t}).then(function(e){var t=[i.Promise.resolve(e)],r=e.files;if(o.checkCRC32)for(var n=0;n<r.length;n++)t.push(f(r[n]));return i.Promise.all(t)}).then(function(e){for(var t=e.shift(),r=t.files,n=0;n<r.length;n++){var i=r[n],s=i.fileNameStr,a=u.resolve(i.fileNameStr);h.file(a,i.decompressed,{binary:!0,optimizedBinaryString:!0,date:i.date,dir:i.dir,comment:i.fileCommentStr.length?i.fileCommentStr:null,unixPermissions:i.unixPermissions,dosPermissions:i.dosPermissions,createFolders:o.createFolders}),i.dir||(h.file(a).unsafeOriginalName=s)}return t.zipComment.length&&(h.comment=t.zipComment),h})}},{"./external":6,"./nodejsUtils":14,"./stream/Crc32Probe":25,"./utf8":31,"./utils":32,"./zipEntries":33}],12:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../stream/GenericWorker");function s(e,t){i.call(this,"Nodejs stream input adapter for "+e),this._upstreamEnded=!1,this._bindStream(t)}n.inherits(s,i),s.prototype._bindStream=function(e){var t=this;(this._stream=e).pause(),e.on("data",function(e){t.push({data:e,meta:{percent:0}})}).on("error",function(e){t.isPaused?this.generatedError=e:t.error(e)}).on("end",function(){t.isPaused?t._upstreamEnded=!0:t.end()})},s.prototype.pause=function(){return!!i.prototype.pause.call(this)&&(this._stream.pause(),!0)},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(this._upstreamEnded?this.end():this._stream.resume(),!0)},t.exports=s},{"../stream/GenericWorker":28,"../utils":32}],13:[function(e,t,r){"use strict";var i=e("readable-stream").Readable;function n(e,t,r){i.call(this,t),this._helper=e;var n=this;e.on("data",function(e,t){n.push(e)||n._helper.pause(),r&&r(t)}).on("error",function(e){n.emit("error",e)}).on("end",function(){n.push(null)})}e("../utils").inherits(n,i),n.prototype._read=function(){this._helper.resume()},t.exports=n},{"../utils":32,"readable-stream":16}],14:[function(e,t,r){"use strict";t.exports={isNode:"undefined"!=typeof Buffer,newBufferFrom:function(e,t){if(Buffer.from&&Buffer.from!==Uint8Array.from)return Buffer.from(e,t);if("number"==typeof e)throw new Error('The "data" argument must not be a number');return new Buffer(e,t)},allocBuffer:function(e){if(Buffer.alloc)return Buffer.alloc(e);var t=new Buffer(e);return t.fill(0),t},isBuffer:function(e){return Buffer.isBuffer(e)},isStream:function(e){return e&&"function"==typeof e.on&&"function"==typeof e.pause&&"function"==typeof e.resume}}},{}],15:[function(e,t,r){"use strict";function s(e,t,r){var n,i=u.getTypeOf(t),s=u.extend(r||{},f);s.date=s.date||new Date,null!==s.compression&&(s.compression=s.compression.toUpperCase()),"string"==typeof s.unixPermissions&&(s.unixPermissions=parseInt(s.unixPermissions,8)),s.unixPermissions&&16384&s.unixPermissions&&(s.dir=!0),s.dosPermissions&&16&s.dosPermissions&&(s.dir=!0),s.dir&&(e=g(e)),s.createFolders&&(n=_(e))&&b.call(this,n,!0);var a="string"===i&&!1===s.binary&&!1===s.base64;r&&void 0!==r.binary||(s.binary=!a),(t instanceof c&&0===t.uncompressedSize||s.dir||!t||0===t.length)&&(s.base64=!1,s.binary=!0,t="",s.compression="STORE",i="string");var o=null;o=t instanceof c||t instanceof l?t:p.isNode&&p.isStream(t)?new m(e,t):u.prepareContent(e,t,s.binary,s.optimizedBinaryString,s.base64);var h=new d(e,o,s);this.files[e]=h}var i=e("./utf8"),u=e("./utils"),l=e("./stream/GenericWorker"),a=e("./stream/StreamHelper"),f=e("./defaults"),c=e("./compressedObject"),d=e("./zipObject"),o=e("./generate"),p=e("./nodejsUtils"),m=e("./nodejs/NodejsStreamInputAdapter"),_=function(e){"/"===e.slice(-1)&&(e=e.substring(0,e.length-1));var t=e.lastIndexOf("/");return 0<t?e.substring(0,t):""},g=function(e){return"/"!==e.slice(-1)&&(e+="/"),e},b=function(e,t){return t=void 0!==t?t:f.createFolders,e=g(e),this.files[e]||s.call(this,e,null,{dir:!0,createFolders:t}),this.files[e]};function h(e){return"[object RegExp]"===Object.prototype.toString.call(e)}var n={load:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},forEach:function(e){var t,r,n;for(t in this.files)n=this.files[t],(r=t.slice(this.root.length,t.length))&&t.slice(0,this.root.length)===this.root&&e(r,n)},filter:function(r){var n=[];return this.forEach(function(e,t){r(e,t)&&n.push(t)}),n},file:function(e,t,r){if(1!==arguments.length)return e=this.root+e,s.call(this,e,t,r),this;if(h(e)){var n=e;return this.filter(function(e,t){return!t.dir&&n.test(e)})}var i=this.files[this.root+e];return i&&!i.dir?i:null},folder:function(r){if(!r)return this;if(h(r))return this.filter(function(e,t){return t.dir&&r.test(e)});var e=this.root+r,t=b.call(this,e),n=this.clone();return n.root=t.name,n},remove:function(r){r=this.root+r;var e=this.files[r];if(e||("/"!==r.slice(-1)&&(r+="/"),e=this.files[r]),e&&!e.dir)delete this.files[r];else for(var t=this.filter(function(e,t){return t.name.slice(0,r.length)===r}),n=0;n<t.length;n++)delete this.files[t[n].name];return this},generate:function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},generateInternalStream:function(e){var t,r={};try{if((r=u.extend(e||{},{streamFiles:!1,compression:"STORE",compressionOptions:null,type:"",platform:"DOS",comment:null,mimeType:"application/zip",encodeFileName:i.utf8encode})).type=r.type.toLowerCase(),r.compression=r.compression.toUpperCase(),"binarystring"===r.type&&(r.type="string"),!r.type)throw new Error("No output type specified.");u.checkSupport(r.type),"darwin"!==r.platform&&"freebsd"!==r.platform&&"linux"!==r.platform&&"sunos"!==r.platform||(r.platform="UNIX"),"win32"===r.platform&&(r.platform="DOS");var n=r.comment||this.comment||"";t=o.generateWorker(this,r,n)}catch(e){(t=new l("error")).error(e)}return new a(t,r.type||"string",r.mimeType)},generateAsync:function(e,t){return this.generateInternalStream(e).accumulate(t)},generateNodeStream:function(e,t){return(e=e||{}).type||(e.type="nodebuffer"),this.generateInternalStream(e).toNodejsStream(t)}};t.exports=n},{"./compressedObject":2,"./defaults":5,"./generate":9,"./nodejs/NodejsStreamInputAdapter":12,"./nodejsUtils":14,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31,"./utils":32,"./zipObject":35}],16:[function(e,t,r){"use strict";t.exports=e("stream")},{stream:void 0}],17:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e);for(var t=0;t<this.data.length;t++)e[t]=255&e[t]}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data[this.zero+e]},i.prototype.lastIndexOfSignature=function(e){for(var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.length-4;0<=s;--s)if(this.data[s]===t&&this.data[s+1]===r&&this.data[s+2]===n&&this.data[s+3]===i)return s-this.zero;return-1},i.prototype.readAndCheckSignature=function(e){var t=e.charCodeAt(0),r=e.charCodeAt(1),n=e.charCodeAt(2),i=e.charCodeAt(3),s=this.readData(4);return t===s[0]&&r===s[1]&&n===s[2]&&i===s[3]},i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return[];var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],18:[function(e,t,r){"use strict";var n=e("../utils");function i(e){this.data=e,this.length=e.length,this.index=0,this.zero=0}i.prototype={checkOffset:function(e){this.checkIndex(this.index+e)},checkIndex:function(e){if(this.length<this.zero+e||e<0)throw new Error("End of data reached (data length = "+this.length+", asked index = "+e+"). Corrupted zip ?")},setIndex:function(e){this.checkIndex(e),this.index=e},skip:function(e){this.setIndex(this.index+e)},byteAt:function(){},readInt:function(e){var t,r=0;for(this.checkOffset(e),t=this.index+e-1;t>=this.index;t--)r=(r<<8)+this.byteAt(t);return this.index+=e,r},readString:function(e){return n.transformTo("string",this.readData(e))},readData:function(){},lastIndexOfSignature:function(){},readAndCheckSignature:function(){},readDate:function(){var e=this.readInt(4);return new Date(Date.UTC(1980+(e>>25&127),(e>>21&15)-1,e>>16&31,e>>11&31,e>>5&63,(31&e)<<1))}},t.exports=i},{"../utils":32}],19:[function(e,t,r){"use strict";var n=e("./Uint8ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./Uint8ArrayReader":21}],20:[function(e,t,r){"use strict";var n=e("./DataReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.byteAt=function(e){return this.data.charCodeAt(this.zero+e)},i.prototype.lastIndexOfSignature=function(e){return this.data.lastIndexOf(e)-this.zero},i.prototype.readAndCheckSignature=function(e){return e===this.readData(4)},i.prototype.readData=function(e){this.checkOffset(e);var t=this.data.slice(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./DataReader":18}],21:[function(e,t,r){"use strict";var n=e("./ArrayReader");function i(e){n.call(this,e)}e("../utils").inherits(i,n),i.prototype.readData=function(e){if(this.checkOffset(e),0===e)return new Uint8Array(0);var t=this.data.subarray(this.zero+this.index,this.zero+this.index+e);return this.index+=e,t},t.exports=i},{"../utils":32,"./ArrayReader":17}],22:[function(e,t,r){"use strict";var n=e("../utils"),i=e("../support"),s=e("./ArrayReader"),a=e("./StringReader"),o=e("./NodeBufferReader"),h=e("./Uint8ArrayReader");t.exports=function(e){var t=n.getTypeOf(e);return n.checkSupport(t),"string"!==t||i.uint8array?"nodebuffer"===t?new o(e):i.uint8array?new h(n.transformTo("uint8array",e)):new s(n.transformTo("array",e)):new a(e)}},{"../support":30,"../utils":32,"./ArrayReader":17,"./NodeBufferReader":19,"./StringReader":20,"./Uint8ArrayReader":21}],23:[function(e,t,r){"use strict";r.LOCAL_FILE_HEADER="PK",r.CENTRAL_FILE_HEADER="PK",r.CENTRAL_DIRECTORY_END="PK",r.ZIP64_CENTRAL_DIRECTORY_LOCATOR="PK",r.ZIP64_CENTRAL_DIRECTORY_END="PK",r.DATA_DESCRIPTOR="PK\b"},{}],24:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../utils");function s(e){n.call(this,"ConvertWorker to "+e),this.destType=e}i.inherits(s,n),s.prototype.processChunk=function(e){this.push({data:i.transformTo(this.destType,e.data),meta:e.meta})},t.exports=s},{"../utils":32,"./GenericWorker":28}],25:[function(e,t,r){"use strict";var n=e("./GenericWorker"),i=e("../crc32");function s(){n.call(this,"Crc32Probe"),this.withStreamInfo("crc32",0)}e("../utils").inherits(s,n),s.prototype.processChunk=function(e){this.streamInfo.crc32=i(e.data,this.streamInfo.crc32||0),this.push(e)},t.exports=s},{"../crc32":4,"../utils":32,"./GenericWorker":28}],26:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataLengthProbe for "+e),this.propName=e,this.withStreamInfo(e,0)}n.inherits(s,i),s.prototype.processChunk=function(e){if(e){var t=this.streamInfo[this.propName]||0;this.streamInfo[this.propName]=t+e.data.length}i.prototype.processChunk.call(this,e)},t.exports=s},{"../utils":32,"./GenericWorker":28}],27:[function(e,t,r){"use strict";var n=e("../utils"),i=e("./GenericWorker");function s(e){i.call(this,"DataWorker");var t=this;this.dataIsReady=!1,this.index=0,this.max=0,this.data=null,this.type="",this._tickScheduled=!1,e.then(function(e){t.dataIsReady=!0,t.data=e,t.max=e&&e.length||0,t.type=n.getTypeOf(e),t.isPaused||t._tickAndRepeat()},function(e){t.error(e)})}n.inherits(s,i),s.prototype.cleanUp=function(){i.prototype.cleanUp.call(this),this.data=null},s.prototype.resume=function(){return!!i.prototype.resume.call(this)&&(!this._tickScheduled&&this.dataIsReady&&(this._tickScheduled=!0,n.delay(this._tickAndRepeat,[],this)),!0)},s.prototype._tickAndRepeat=function(){this._tickScheduled=!1,this.isPaused||this.isFinished||(this._tick(),this.isFinished||(n.delay(this._tickAndRepeat,[],this),this._tickScheduled=!0))},s.prototype._tick=function(){if(this.isPaused||this.isFinished)return!1;var e=null,t=Math.min(this.max,this.index+16384);if(this.index>=this.max)return this.end();switch(this.type){case"string":e=this.data.substring(this.index,t);break;case"uint8array":e=this.data.subarray(this.index,t);break;case"array":case"nodebuffer":e=this.data.slice(this.index,t)}return this.index=t,this.push({data:e,meta:{percent:this.max?this.index/this.max*100:0}})},t.exports=s},{"../utils":32,"./GenericWorker":28}],28:[function(e,t,r){"use strict";function n(e){this.name=e||"default",this.streamInfo={},this.generatedError=null,this.extraStreamInfo={},this.isPaused=!0,this.isFinished=!1,this.isLocked=!1,this._listeners={data:[],end:[],error:[]},this.previous=null}n.prototype={push:function(e){this.emit("data",e)},end:function(){if(this.isFinished)return!1;this.flush();try{this.emit("end"),this.cleanUp(),this.isFinished=!0}catch(e){this.emit("error",e)}return!0},error:function(e){return!this.isFinished&&(this.isPaused?this.generatedError=e:(this.isFinished=!0,this.emit("error",e),this.previous&&this.previous.error(e),this.cleanUp()),!0)},on:function(e,t){return this._listeners[e].push(t),this},cleanUp:function(){this.streamInfo=this.generatedError=this.extraStreamInfo=null,this._listeners=[]},emit:function(e,t){if(this._listeners[e])for(var r=0;r<this._listeners[e].length;r++)this._listeners[e][r].call(this,t)},pipe:function(e){return e.registerPrevious(this)},registerPrevious:function(e){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.streamInfo=e.streamInfo,this.mergeStreamInfo(),this.previous=e;var t=this;return e.on("data",function(e){t.processChunk(e)}),e.on("end",function(){t.end()}),e.on("error",function(e){t.error(e)}),this},pause:function(){return!this.isPaused&&!this.isFinished&&(this.isPaused=!0,this.previous&&this.previous.pause(),!0)},resume:function(){if(!this.isPaused||this.isFinished)return!1;var e=this.isPaused=!1;return this.generatedError&&(this.error(this.generatedError),e=!0),this.previous&&this.previous.resume(),!e},flush:function(){},processChunk:function(e){this.push(e)},withStreamInfo:function(e,t){return this.extraStreamInfo[e]=t,this.mergeStreamInfo(),this},mergeStreamInfo:function(){for(var e in this.extraStreamInfo)Object.prototype.hasOwnProperty.call(this.extraStreamInfo,e)&&(this.streamInfo[e]=this.extraStreamInfo[e])},lock:function(){if(this.isLocked)throw new Error("The stream '"+this+"' has already been used.");this.isLocked=!0,this.previous&&this.previous.lock()},toString:function(){var e="Worker "+this.name;return this.previous?this.previous+" -> "+e:e}},t.exports=n},{}],29:[function(e,t,r){"use strict";var h=e("../utils"),i=e("./ConvertWorker"),s=e("./GenericWorker"),u=e("../base64"),n=e("../support"),a=e("../external"),o=null;if(n.nodestream)try{o=e("../nodejs/NodejsStreamOutputAdapter")}catch(e){}function l(e,o){return new a.Promise(function(t,r){var n=[],i=e._internalType,s=e._outputType,a=e._mimeType;e.on("data",function(e,t){n.push(e),o&&o(t)}).on("error",function(e){n=[],r(e)}).on("end",function(){try{var e=function(e,t,r){switch(e){case"blob":return h.newBlob(h.transformTo("arraybuffer",t),r);case"base64":return u.encode(t);default:return h.transformTo(e,t)}}(s,function(e,t){var r,n=0,i=null,s=0;for(r=0;r<t.length;r++)s+=t[r].length;switch(e){case"string":return t.join("");case"array":return Array.prototype.concat.apply([],t);case"uint8array":for(i=new Uint8Array(s),r=0;r<t.length;r++)i.set(t[r],n),n+=t[r].length;return i;case"nodebuffer":return Buffer.concat(t);default:throw new Error("concat : unsupported type '"+e+"'")}}(i,n),a);t(e)}catch(e){r(e)}n=[]}).resume()})}function f(e,t,r){var n=t;switch(t){case"blob":case"arraybuffer":n="uint8array";break;case"base64":n="string"}try{this._internalType=n,this._outputType=t,this._mimeType=r,h.checkSupport(n),this._worker=e.pipe(new i(n)),e.lock()}catch(e){this._worker=new s("error"),this._worker.error(e)}}f.prototype={accumulate:function(e){return l(this,e)},on:function(e,t){var r=this;return"data"===e?this._worker.on(e,function(e){t.call(r,e.data,e.meta)}):this._worker.on(e,function(){h.delay(t,arguments,r)}),this},resume:function(){return h.delay(this._worker.resume,[],this._worker),this},pause:function(){return this._worker.pause(),this},toNodejsStream:function(e){if(h.checkSupport("nodestream"),"nodebuffer"!==this._outputType)throw new Error(this._outputType+" is not supported by this method");return new o(this,{objectMode:"nodebuffer"!==this._outputType},e)}},t.exports=f},{"../base64":1,"../external":6,"../nodejs/NodejsStreamOutputAdapter":13,"../support":30,"../utils":32,"./ConvertWorker":24,"./GenericWorker":28}],30:[function(e,t,r){"use strict";if(r.base64=!0,r.array=!0,r.string=!0,r.arraybuffer="undefined"!=typeof ArrayBuffer&&"undefined"!=typeof Uint8Array,r.nodebuffer="undefined"!=typeof Buffer,r.uint8array="undefined"!=typeof Uint8Array,"undefined"==typeof ArrayBuffer)r.blob=!1;else{var n=new ArrayBuffer(0);try{r.blob=0===new Blob([n],{type:"application/zip"}).size}catch(e){try{var i=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);i.append(n),r.blob=0===i.getBlob("application/zip").size}catch(e){r.blob=!1}}}try{r.nodestream=!!e("readable-stream").Readable}catch(e){r.nodestream=!1}},{"readable-stream":16}],31:[function(e,t,s){"use strict";for(var o=e("./utils"),h=e("./support"),r=e("./nodejsUtils"),n=e("./stream/GenericWorker"),u=new Array(256),i=0;i<256;i++)u[i]=252<=i?6:248<=i?5:240<=i?4:224<=i?3:192<=i?2:1;u[254]=u[254]=1;function a(){n.call(this,"utf-8 decode"),this.leftOver=null}function l(){n.call(this,"utf-8 encode")}s.utf8encode=function(e){return h.nodebuffer?r.newBufferFrom(e,"utf-8"):function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=h.uint8array?new Uint8Array(o):new Array(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t}(e)},s.utf8decode=function(e){return h.nodebuffer?o.transformTo("nodebuffer",e).toString("utf-8"):function(e){var t,r,n,i,s=e.length,a=new Array(2*s);for(t=r=0;t<s;)if((n=e[t++])<128)a[r++]=n;else if(4<(i=u[n]))a[r++]=65533,t+=i-1;else{for(n&=2===i?31:3===i?15:7;1<i&&t<s;)n=n<<6|63&e[t++],i--;1<i?a[r++]=65533:n<65536?a[r++]=n:(n-=65536,a[r++]=55296|n>>10&1023,a[r++]=56320|1023&n)}return a.length!==r&&(a.subarray?a=a.subarray(0,r):a.length=r),o.applyFromCharCode(a)}(e=o.transformTo(h.uint8array?"uint8array":"array",e))},o.inherits(a,n),a.prototype.processChunk=function(e){var t=o.transformTo(h.uint8array?"uint8array":"array",e.data);if(this.leftOver&&this.leftOver.length){if(h.uint8array){var r=t;(t=new Uint8Array(r.length+this.leftOver.length)).set(this.leftOver,0),t.set(r,this.leftOver.length)}else t=this.leftOver.concat(t);this.leftOver=null}var n=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}(t),i=t;n!==t.length&&(h.uint8array?(i=t.subarray(0,n),this.leftOver=t.subarray(n,t.length)):(i=t.slice(0,n),this.leftOver=t.slice(n,t.length))),this.push({data:s.utf8decode(i),meta:e.meta})},a.prototype.flush=function(){this.leftOver&&this.leftOver.length&&(this.push({data:s.utf8decode(this.leftOver),meta:{}}),this.leftOver=null)},s.Utf8DecodeWorker=a,o.inherits(l,n),l.prototype.processChunk=function(e){this.push({data:s.utf8encode(e.data),meta:e.meta})},s.Utf8EncodeWorker=l},{"./nodejsUtils":14,"./stream/GenericWorker":28,"./support":30,"./utils":32}],32:[function(e,t,a){"use strict";var o=e("./support"),h=e("./base64"),r=e("./nodejsUtils"),u=e("./external");function n(e){return e}function l(e,t){for(var r=0;r<e.length;++r)t[r]=255&e.charCodeAt(r);return t}e("setimmediate"),a.newBlob=function(t,r){a.checkSupport("blob");try{return new Blob([t],{type:r})}catch(e){try{var n=new(self.BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||self.MSBlobBuilder);return n.append(t),n.getBlob(r)}catch(e){throw new Error("Bug : can't construct the Blob.")}}};var i={stringifyByChunk:function(e,t,r){var n=[],i=0,s=e.length;if(s<=r)return String.fromCharCode.apply(null,e);for(;i<s;)"array"===t||"nodebuffer"===t?n.push(String.fromCharCode.apply(null,e.slice(i,Math.min(i+r,s)))):n.push(String.fromCharCode.apply(null,e.subarray(i,Math.min(i+r,s)))),i+=r;return n.join("")},stringifyByChar:function(e){for(var t="",r=0;r<e.length;r++)t+=String.fromCharCode(e[r]);return t},applyCanBeUsed:{uint8array:function(){try{return o.uint8array&&1===String.fromCharCode.apply(null,new Uint8Array(1)).length}catch(e){return!1}}(),nodebuffer:function(){try{return o.nodebuffer&&1===String.fromCharCode.apply(null,r.allocBuffer(1)).length}catch(e){return!1}}()}};function s(e){var t=65536,r=a.getTypeOf(e),n=!0;if("uint8array"===r?n=i.applyCanBeUsed.uint8array:"nodebuffer"===r&&(n=i.applyCanBeUsed.nodebuffer),n)for(;1<t;)try{return i.stringifyByChunk(e,r,t)}catch(e){t=Math.floor(t/2)}return i.stringifyByChar(e)}function f(e,t){for(var r=0;r<e.length;r++)t[r]=e[r];return t}a.applyFromCharCode=s;var c={};c.string={string:n,array:function(e){return l(e,new Array(e.length))},arraybuffer:function(e){return c.string.uint8array(e).buffer},uint8array:function(e){return l(e,new Uint8Array(e.length))},nodebuffer:function(e){return l(e,r.allocBuffer(e.length))}},c.array={string:s,array:n,arraybuffer:function(e){return new Uint8Array(e).buffer},uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(e)}},c.arraybuffer={string:function(e){return s(new Uint8Array(e))},array:function(e){return f(new Uint8Array(e),new Array(e.byteLength))},arraybuffer:n,uint8array:function(e){return new Uint8Array(e)},nodebuffer:function(e){return r.newBufferFrom(new Uint8Array(e))}},c.uint8array={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return e.buffer},uint8array:n,nodebuffer:function(e){return r.newBufferFrom(e)}},c.nodebuffer={string:s,array:function(e){return f(e,new Array(e.length))},arraybuffer:function(e){return c.nodebuffer.uint8array(e).buffer},uint8array:function(e){return f(e,new Uint8Array(e.length))},nodebuffer:n},a.transformTo=function(e,t){if(t=t||"",!e)return t;a.checkSupport(e);var r=a.getTypeOf(t);return c[r][e](t)},a.resolve=function(e){for(var t=e.split("/"),r=[],n=0;n<t.length;n++){var i=t[n];"."===i||""===i&&0!==n&&n!==t.length-1||(".."===i?r.pop():r.push(i))}return r.join("/")},a.getTypeOf=function(e){return"string"==typeof e?"string":"[object Array]"===Object.prototype.toString.call(e)?"array":o.nodebuffer&&r.isBuffer(e)?"nodebuffer":o.uint8array&&e instanceof Uint8Array?"uint8array":o.arraybuffer&&e instanceof ArrayBuffer?"arraybuffer":void 0},a.checkSupport=function(e){if(!o[e.toLowerCase()])throw new Error(e+" is not supported by this platform")},a.MAX_VALUE_16BITS=65535,a.MAX_VALUE_32BITS=-1,a.pretty=function(e){var t,r,n="";for(r=0;r<(e||"").length;r++)n+="\\x"+((t=e.charCodeAt(r))<16?"0":"")+t.toString(16).toUpperCase();return n},a.delay=function(e,t,r){setImmediate(function(){e.apply(r||null,t||[])})},a.inherits=function(e,t){function r(){}r.prototype=t.prototype,e.prototype=new r},a.extend=function(){var e,t,r={};for(e=0;e<arguments.length;e++)for(t in arguments[e])Object.prototype.hasOwnProperty.call(arguments[e],t)&&void 0===r[t]&&(r[t]=arguments[e][t]);return r},a.prepareContent=function(r,e,n,i,s){return u.Promise.resolve(e).then(function(n){return o.blob&&(n instanceof Blob||-1!==["[object File]","[object Blob]"].indexOf(Object.prototype.toString.call(n)))&&"undefined"!=typeof FileReader?new u.Promise(function(t,r){var e=new FileReader;e.onload=function(e){t(e.target.result)},e.onerror=function(e){r(e.target.error)},e.readAsArrayBuffer(n)}):n}).then(function(e){var t=a.getTypeOf(e);return t?("arraybuffer"===t?e=a.transformTo("uint8array",e):"string"===t&&(s?e=h.decode(e):n&&!0!==i&&(e=function(e){return l(e,o.uint8array?new Uint8Array(e.length):new Array(e.length))}(e))),e):u.Promise.reject(new Error("Can't read the data of '"+r+"'. Is it in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?"))})}},{"./base64":1,"./external":6,"./nodejsUtils":14,"./support":30,setimmediate:54}],33:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),i=e("./utils"),s=e("./signature"),a=e("./zipEntry"),o=e("./support");function h(e){this.files=[],this.loadOptions=e}h.prototype={checkSignature:function(e){if(!this.reader.readAndCheckSignature(e)){this.reader.index-=4;var t=this.reader.readString(4);throw new Error("Corrupted zip or bug: unexpected signature ("+i.pretty(t)+", expected "+i.pretty(e)+")")}},isSignature:function(e,t){var r=this.reader.index;this.reader.setIndex(e);var n=this.reader.readString(4)===t;return this.reader.setIndex(r),n},readBlockEndOfCentral:function(){this.diskNumber=this.reader.readInt(2),this.diskWithCentralDirStart=this.reader.readInt(2),this.centralDirRecordsOnThisDisk=this.reader.readInt(2),this.centralDirRecords=this.reader.readInt(2),this.centralDirSize=this.reader.readInt(4),this.centralDirOffset=this.reader.readInt(4),this.zipCommentLength=this.reader.readInt(2);var e=this.reader.readData(this.zipCommentLength),t=o.uint8array?"uint8array":"array",r=i.transformTo(t,e);this.zipComment=this.loadOptions.decodeFileName(r)},readBlockZip64EndOfCentral:function(){this.zip64EndOfCentralSize=this.reader.readInt(8),this.reader.skip(4),this.diskNumber=this.reader.readInt(4),this.diskWithCentralDirStart=this.reader.readInt(4),this.centralDirRecordsOnThisDisk=this.reader.readInt(8),this.centralDirRecords=this.reader.readInt(8),this.centralDirSize=this.reader.readInt(8),this.centralDirOffset=this.reader.readInt(8),this.zip64ExtensibleData={};for(var e,t,r,n=this.zip64EndOfCentralSize-44;0<n;)e=this.reader.readInt(2),t=this.reader.readInt(4),r=this.reader.readData(t),this.zip64ExtensibleData[e]={id:e,length:t,value:r}},readBlockZip64EndOfCentralLocator:function(){if(this.diskWithZip64CentralDirStart=this.reader.readInt(4),this.relativeOffsetEndOfZip64CentralDir=this.reader.readInt(8),this.disksCount=this.reader.readInt(4),1<this.disksCount)throw new Error("Multi-volumes zip are not supported")},readLocalFiles:function(){var e,t;for(e=0;e<this.files.length;e++)t=this.files[e],this.reader.setIndex(t.localHeaderOffset),this.checkSignature(s.LOCAL_FILE_HEADER),t.readLocalPart(this.reader),t.handleUTF8(),t.processAttributes()},readCentralDir:function(){var e;for(this.reader.setIndex(this.centralDirOffset);this.reader.readAndCheckSignature(s.CENTRAL_FILE_HEADER);)(e=new a({zip64:this.zip64},this.loadOptions)).readCentralPart(this.reader),this.files.push(e);if(this.centralDirRecords!==this.files.length&&0!==this.centralDirRecords&&0===this.files.length)throw new Error("Corrupted zip or bug: expected "+this.centralDirRecords+" records in central dir, got "+this.files.length)},readEndOfCentral:function(){var e=this.reader.lastIndexOfSignature(s.CENTRAL_DIRECTORY_END);if(e<0)throw!this.isSignature(0,s.LOCAL_FILE_HEADER)?new Error("Can't find end of central directory : is this a zip file ? If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html"):new Error("Corrupted zip: can't find end of central directory");this.reader.setIndex(e);var t=e;if(this.checkSignature(s.CENTRAL_DIRECTORY_END),this.readBlockEndOfCentral(),this.diskNumber===i.MAX_VALUE_16BITS||this.diskWithCentralDirStart===i.MAX_VALUE_16BITS||this.centralDirRecordsOnThisDisk===i.MAX_VALUE_16BITS||this.centralDirRecords===i.MAX_VALUE_16BITS||this.centralDirSize===i.MAX_VALUE_32BITS||this.centralDirOffset===i.MAX_VALUE_32BITS){if(this.zip64=!0,(e=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR))<0)throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");if(this.reader.setIndex(e),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_LOCATOR),this.readBlockZip64EndOfCentralLocator(),!this.isSignature(this.relativeOffsetEndOfZip64CentralDir,s.ZIP64_CENTRAL_DIRECTORY_END)&&(this.relativeOffsetEndOfZip64CentralDir=this.reader.lastIndexOfSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.relativeOffsetEndOfZip64CentralDir<0))throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir),this.checkSignature(s.ZIP64_CENTRAL_DIRECTORY_END),this.readBlockZip64EndOfCentral()}var r=this.centralDirOffset+this.centralDirSize;this.zip64&&(r+=20,r+=12+this.zip64EndOfCentralSize);var n=t-r;if(0<n)this.isSignature(t,s.CENTRAL_FILE_HEADER)||(this.reader.zero=n);else if(n<0)throw new Error("Corrupted zip: missing "+Math.abs(n)+" bytes.")},prepareReader:function(e){this.reader=n(e)},load:function(e){this.prepareReader(e),this.readEndOfCentral(),this.readCentralDir(),this.readLocalFiles()}},t.exports=h},{"./reader/readerFor":22,"./signature":23,"./support":30,"./utils":32,"./zipEntry":34}],34:[function(e,t,r){"use strict";var n=e("./reader/readerFor"),s=e("./utils"),i=e("./compressedObject"),a=e("./crc32"),o=e("./utf8"),h=e("./compressions"),u=e("./support");function l(e,t){this.options=e,this.loadOptions=t}l.prototype={isEncrypted:function(){return 1==(1&this.bitFlag)},useUTF8:function(){return 2048==(2048&this.bitFlag)},readLocalPart:function(e){var t,r;if(e.skip(22),this.fileNameLength=e.readInt(2),r=e.readInt(2),this.fileName=e.readData(this.fileNameLength),e.skip(r),-1===this.compressedSize||-1===this.uncompressedSize)throw new Error("Bug or corrupted zip : didn't get enough information from the central directory (compressedSize === -1 || uncompressedSize === -1)");if(null===(t=function(e){for(var t in h)if(Object.prototype.hasOwnProperty.call(h,t)&&h[t].magic===e)return h[t];return null}(this.compressionMethod)))throw new Error("Corrupted zip : compression "+s.pretty(this.compressionMethod)+" unknown (inner file : "+s.transformTo("string",this.fileName)+")");this.decompressed=new i(this.compressedSize,this.uncompressedSize,this.crc32,t,e.readData(this.compressedSize))},readCentralPart:function(e){this.versionMadeBy=e.readInt(2),e.skip(2),this.bitFlag=e.readInt(2),this.compressionMethod=e.readString(2),this.date=e.readDate(),this.crc32=e.readInt(4),this.compressedSize=e.readInt(4),this.uncompressedSize=e.readInt(4);var t=e.readInt(2);if(this.extraFieldsLength=e.readInt(2),this.fileCommentLength=e.readInt(2),this.diskNumberStart=e.readInt(2),this.internalFileAttributes=e.readInt(2),this.externalFileAttributes=e.readInt(4),this.localHeaderOffset=e.readInt(4),this.isEncrypted())throw new Error("Encrypted zip are not supported");e.skip(t),this.readExtraFields(e),this.parseZIP64ExtraField(e),this.fileComment=e.readData(this.fileCommentLength)},processAttributes:function(){this.unixPermissions=null,this.dosPermissions=null;var e=this.versionMadeBy>>8;this.dir=!!(16&this.externalFileAttributes),0==e&&(this.dosPermissions=63&this.externalFileAttributes),3==e&&(this.unixPermissions=this.externalFileAttributes>>16&65535),this.dir||"/"!==this.fileNameStr.slice(-1)||(this.dir=!0)},parseZIP64ExtraField:function(){if(this.extraFields[1]){var e=n(this.extraFields[1].value);this.uncompressedSize===s.MAX_VALUE_32BITS&&(this.uncompressedSize=e.readInt(8)),this.compressedSize===s.MAX_VALUE_32BITS&&(this.compressedSize=e.readInt(8)),this.localHeaderOffset===s.MAX_VALUE_32BITS&&(this.localHeaderOffset=e.readInt(8)),this.diskNumberStart===s.MAX_VALUE_32BITS&&(this.diskNumberStart=e.readInt(4))}},readExtraFields:function(e){var t,r,n,i=e.index+this.extraFieldsLength;for(this.extraFields||(this.extraFields={});e.index+4<i;)t=e.readInt(2),r=e.readInt(2),n=e.readData(r),this.extraFields[t]={id:t,length:r,value:n};e.setIndex(i)},handleUTF8:function(){var e=u.uint8array?"uint8array":"array";if(this.useUTF8())this.fileNameStr=o.utf8decode(this.fileName),this.fileCommentStr=o.utf8decode(this.fileComment);else{var t=this.findExtraFieldUnicodePath();if(null!==t)this.fileNameStr=t;else{var r=s.transformTo(e,this.fileName);this.fileNameStr=this.loadOptions.decodeFileName(r)}var n=this.findExtraFieldUnicodeComment();if(null!==n)this.fileCommentStr=n;else{var i=s.transformTo(e,this.fileComment);this.fileCommentStr=this.loadOptions.decodeFileName(i)}}},findExtraFieldUnicodePath:function(){var e=this.extraFields[28789];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileName)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null},findExtraFieldUnicodeComment:function(){var e=this.extraFields[25461];if(e){var t=n(e.value);return 1!==t.readInt(1)?null:a(this.fileComment)!==t.readInt(4)?null:o.utf8decode(t.readData(e.length-5))}return null}},t.exports=l},{"./compressedObject":2,"./compressions":3,"./crc32":4,"./reader/readerFor":22,"./support":30,"./utf8":31,"./utils":32}],35:[function(e,t,r){"use strict";function n(e,t,r){this.name=e,this.dir=r.dir,this.date=r.date,this.comment=r.comment,this.unixPermissions=r.unixPermissions,this.dosPermissions=r.dosPermissions,this._data=t,this._dataBinary=r.binary,this.options={compression:r.compression,compressionOptions:r.compressionOptions}}var s=e("./stream/StreamHelper"),i=e("./stream/DataWorker"),a=e("./utf8"),o=e("./compressedObject"),h=e("./stream/GenericWorker");n.prototype={internalStream:function(e){var t=null,r="string";try{if(!e)throw new Error("No output type specified.");var n="string"===(r=e.toLowerCase())||"text"===r;"binarystring"!==r&&"text"!==r||(r="string"),t=this._decompressWorker();var i=!this._dataBinary;i&&!n&&(t=t.pipe(new a.Utf8EncodeWorker)),!i&&n&&(t=t.pipe(new a.Utf8DecodeWorker))}catch(e){(t=new h("error")).error(e)}return new s(t,r,"")},async:function(e,t){return this.internalStream(e).accumulate(t)},nodeStream:function(e,t){return this.internalStream(e||"nodebuffer").toNodejsStream(t)},_compressWorker:function(e,t){if(this._data instanceof o&&this._data.compression.magic===e.magic)return this._data.getCompressedWorker();var r=this._decompressWorker();return this._dataBinary||(r=r.pipe(new a.Utf8EncodeWorker)),o.createWorkerFrom(r,e,t)},_decompressWorker:function(){return this._data instanceof o?this._data.getContentWorker():this._data instanceof h?this._data:new i(this._data)}};for(var u=["asText","asBinary","asNodeBuffer","asUint8Array","asArrayBuffer"],l=function(){throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.")},f=0;f<u.length;f++)n.prototype[u[f]]=l;t.exports=n},{"./compressedObject":2,"./stream/DataWorker":27,"./stream/GenericWorker":28,"./stream/StreamHelper":29,"./utf8":31}],36:[function(e,l,t){(function(t){"use strict";var r,n,e=t.MutationObserver||t.WebKitMutationObserver;if(e){var i=0,s=new e(u),a=t.document.createTextNode("");s.observe(a,{characterData:!0}),r=function(){a.data=i=++i%2}}else if(t.setImmediate||void 0===t.MessageChannel)r="document"in t&&"onreadystatechange"in t.document.createElement("script")?function(){var e=t.document.createElement("script");e.onreadystatechange=function(){u(),e.onreadystatechange=null,e.parentNode.removeChild(e),e=null},t.document.documentElement.appendChild(e)}:function(){setTimeout(u,0)};else{var o=new t.MessageChannel;o.port1.onmessage=u,r=function(){o.port2.postMessage(0)}}var h=[];function u(){var e,t;n=!0;for(var r=h.length;r;){for(t=h,h=[],e=-1;++e<r;)t[e]();r=h.length}n=!1}l.exports=function(e){1!==h.push(e)||n||r()}}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],37:[function(e,t,r){"use strict";var i=e("immediate");function u(){}var l={},s=["REJECTED"],a=["FULFILLED"],n=["PENDING"];function o(e){if("function"!=typeof e)throw new TypeError("resolver must be a function");this.state=n,this.queue=[],this.outcome=void 0,e!==u&&d(this,e)}function h(e,t,r){this.promise=e,"function"==typeof t&&(this.onFulfilled=t,this.callFulfilled=this.otherCallFulfilled),"function"==typeof r&&(this.onRejected=r,this.callRejected=this.otherCallRejected)}function f(t,r,n){i(function(){var e;try{e=r(n)}catch(e){return l.reject(t,e)}e===t?l.reject(t,new TypeError("Cannot resolve promise with itself")):l.resolve(t,e)})}function c(e){var t=e&&e.then;if(e&&("object"==typeof e||"function"==typeof e)&&"function"==typeof t)return function(){t.apply(e,arguments)}}function d(t,e){var r=!1;function n(e){r||(r=!0,l.reject(t,e))}function i(e){r||(r=!0,l.resolve(t,e))}var s=p(function(){e(i,n)});"error"===s.status&&n(s.value)}function p(e,t){var r={};try{r.value=e(t),r.status="success"}catch(e){r.status="error",r.value=e}return r}(t.exports=o).prototype.finally=function(t){if("function"!=typeof t)return this;var r=this.constructor;return this.then(function(e){return r.resolve(t()).then(function(){return e})},function(e){return r.resolve(t()).then(function(){throw e})})},o.prototype.catch=function(e){return this.then(null,e)},o.prototype.then=function(e,t){if("function"!=typeof e&&this.state===a||"function"!=typeof t&&this.state===s)return this;var r=new this.constructor(u);this.state!==n?f(r,this.state===a?e:t,this.outcome):this.queue.push(new h(r,e,t));return r},h.prototype.callFulfilled=function(e){l.resolve(this.promise,e)},h.prototype.otherCallFulfilled=function(e){f(this.promise,this.onFulfilled,e)},h.prototype.callRejected=function(e){l.reject(this.promise,e)},h.prototype.otherCallRejected=function(e){f(this.promise,this.onRejected,e)},l.resolve=function(e,t){var r=p(c,t);if("error"===r.status)return l.reject(e,r.value);var n=r.value;if(n)d(e,n);else{e.state=a,e.outcome=t;for(var i=-1,s=e.queue.length;++i<s;)e.queue[i].callFulfilled(t)}return e},l.reject=function(e,t){e.state=s,e.outcome=t;for(var r=-1,n=e.queue.length;++r<n;)e.queue[r].callRejected(t);return e},o.resolve=function(e){if(e instanceof this)return e;return l.resolve(new this(u),e)},o.reject=function(e){var t=new this(u);return l.reject(t,e)},o.all=function(e){var r=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var n=e.length,i=!1;if(!n)return this.resolve([]);var s=new Array(n),a=0,t=-1,o=new this(u);for(;++t<n;)h(e[t],t);return o;function h(e,t){r.resolve(e).then(function(e){s[t]=e,++a!==n||i||(i=!0,l.resolve(o,s))},function(e){i||(i=!0,l.reject(o,e))})}},o.race=function(e){var t=this;if("[object Array]"!==Object.prototype.toString.call(e))return this.reject(new TypeError("must be an array"));var r=e.length,n=!1;if(!r)return this.resolve([]);var i=-1,s=new this(u);for(;++i<r;)a=e[i],t.resolve(a).then(function(e){n||(n=!0,l.resolve(s,e))},function(e){n||(n=!0,l.reject(s,e))});var a;return s}},{immediate:36}],38:[function(e,t,r){"use strict";var n={};(0,e("./lib/utils/common").assign)(n,e("./lib/deflate"),e("./lib/inflate"),e("./lib/zlib/constants")),t.exports=n},{"./lib/deflate":39,"./lib/inflate":40,"./lib/utils/common":41,"./lib/zlib/constants":44}],39:[function(e,t,r){"use strict";var a=e("./zlib/deflate"),o=e("./utils/common"),h=e("./utils/strings"),i=e("./zlib/messages"),s=e("./zlib/zstream"),u=Object.prototype.toString,l=0,f=-1,c=0,d=8;function p(e){if(!(this instanceof p))return new p(e);this.options=o.assign({level:f,method:d,chunkSize:16384,windowBits:15,memLevel:8,strategy:c,to:""},e||{});var t=this.options;t.raw&&0<t.windowBits?t.windowBits=-t.windowBits:t.gzip&&0<t.windowBits&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new s,this.strm.avail_out=0;var r=a.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(r!==l)throw new Error(i[r]);if(t.header&&a.deflateSetHeader(this.strm,t.header),t.dictionary){var n;if(n="string"==typeof t.dictionary?h.string2buf(t.dictionary):"[object ArrayBuffer]"===u.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,(r=a.deflateSetDictionary(this.strm,n))!==l)throw new Error(i[r]);this._dict_set=!0}}function n(e,t){var r=new p(t);if(r.push(e,!0),r.err)throw r.msg||i[r.err];return r.result}p.prototype.push=function(e,t){var r,n,i=this.strm,s=this.options.chunkSize;if(this.ended)return!1;n=t===~~t?t:!0===t?4:0,"string"==typeof e?i.input=h.string2buf(e):"[object ArrayBuffer]"===u.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;do{if(0===i.avail_out&&(i.output=new o.Buf8(s),i.next_out=0,i.avail_out=s),1!==(r=a.deflate(i,n))&&r!==l)return this.onEnd(r),!(this.ended=!0);0!==i.avail_out&&(0!==i.avail_in||4!==n&&2!==n)||("string"===this.options.to?this.onData(h.buf2binstring(o.shrinkBuf(i.output,i.next_out))):this.onData(o.shrinkBuf(i.output,i.next_out)))}while((0<i.avail_in||0===i.avail_out)&&1!==r);return 4===n?(r=a.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===l):2!==n||(this.onEnd(l),!(i.avail_out=0))},p.prototype.onData=function(e){this.chunks.push(e)},p.prototype.onEnd=function(e){e===l&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=o.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Deflate=p,r.deflate=n,r.deflateRaw=function(e,t){return(t=t||{}).raw=!0,n(e,t)},r.gzip=function(e,t){return(t=t||{}).gzip=!0,n(e,t)}},{"./utils/common":41,"./utils/strings":42,"./zlib/deflate":46,"./zlib/messages":51,"./zlib/zstream":53}],40:[function(e,t,r){"use strict";var c=e("./zlib/inflate"),d=e("./utils/common"),p=e("./utils/strings"),m=e("./zlib/constants"),n=e("./zlib/messages"),i=e("./zlib/zstream"),s=e("./zlib/gzheader"),_=Object.prototype.toString;function a(e){if(!(this instanceof a))return new a(e);this.options=d.assign({chunkSize:16384,windowBits:0,to:""},e||{});var t=this.options;t.raw&&0<=t.windowBits&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(0<=t.windowBits&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),15<t.windowBits&&t.windowBits<48&&0==(15&t.windowBits)&&(t.windowBits|=15),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new i,this.strm.avail_out=0;var r=c.inflateInit2(this.strm,t.windowBits);if(r!==m.Z_OK)throw new Error(n[r]);this.header=new s,c.inflateGetHeader(this.strm,this.header)}function o(e,t){var r=new a(t);if(r.push(e,!0),r.err)throw r.msg||n[r.err];return r.result}a.prototype.push=function(e,t){var r,n,i,s,a,o,h=this.strm,u=this.options.chunkSize,l=this.options.dictionary,f=!1;if(this.ended)return!1;n=t===~~t?t:!0===t?m.Z_FINISH:m.Z_NO_FLUSH,"string"==typeof e?h.input=p.binstring2buf(e):"[object ArrayBuffer]"===_.call(e)?h.input=new Uint8Array(e):h.input=e,h.next_in=0,h.avail_in=h.input.length;do{if(0===h.avail_out&&(h.output=new d.Buf8(u),h.next_out=0,h.avail_out=u),(r=c.inflate(h,m.Z_NO_FLUSH))===m.Z_NEED_DICT&&l&&(o="string"==typeof l?p.string2buf(l):"[object ArrayBuffer]"===_.call(l)?new Uint8Array(l):l,r=c.inflateSetDictionary(this.strm,o)),r===m.Z_BUF_ERROR&&!0===f&&(r=m.Z_OK,f=!1),r!==m.Z_STREAM_END&&r!==m.Z_OK)return this.onEnd(r),!(this.ended=!0);h.next_out&&(0!==h.avail_out&&r!==m.Z_STREAM_END&&(0!==h.avail_in||n!==m.Z_FINISH&&n!==m.Z_SYNC_FLUSH)||("string"===this.options.to?(i=p.utf8border(h.output,h.next_out),s=h.next_out-i,a=p.buf2string(h.output,i),h.next_out=s,h.avail_out=u-s,s&&d.arraySet(h.output,h.output,i,s,0),this.onData(a)):this.onData(d.shrinkBuf(h.output,h.next_out)))),0===h.avail_in&&0===h.avail_out&&(f=!0)}while((0<h.avail_in||0===h.avail_out)&&r!==m.Z_STREAM_END);return r===m.Z_STREAM_END&&(n=m.Z_FINISH),n===m.Z_FINISH?(r=c.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===m.Z_OK):n!==m.Z_SYNC_FLUSH||(this.onEnd(m.Z_OK),!(h.avail_out=0))},a.prototype.onData=function(e){this.chunks.push(e)},a.prototype.onEnd=function(e){e===m.Z_OK&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=d.flattenChunks(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg},r.Inflate=a,r.inflate=o,r.inflateRaw=function(e,t){return(t=t||{}).raw=!0,o(e,t)},r.ungzip=o},{"./utils/common":41,"./utils/strings":42,"./zlib/constants":44,"./zlib/gzheader":47,"./zlib/inflate":49,"./zlib/messages":51,"./zlib/zstream":53}],41:[function(e,t,r){"use strict";var n="undefined"!=typeof Uint8Array&&"undefined"!=typeof Uint16Array&&"undefined"!=typeof Int32Array;r.assign=function(e){for(var t=Array.prototype.slice.call(arguments,1);t.length;){var r=t.shift();if(r){if("object"!=typeof r)throw new TypeError(r+"must be non-object");for(var n in r)r.hasOwnProperty(n)&&(e[n]=r[n])}}return e},r.shrinkBuf=function(e,t){return e.length===t?e:e.subarray?e.subarray(0,t):(e.length=t,e)};var i={arraySet:function(e,t,r,n,i){if(t.subarray&&e.subarray)e.set(t.subarray(r,r+n),i);else for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){var t,r,n,i,s,a;for(t=n=0,r=e.length;t<r;t++)n+=e[t].length;for(a=new Uint8Array(n),t=i=0,r=e.length;t<r;t++)s=e[t],a.set(s,i),i+=s.length;return a}},s={arraySet:function(e,t,r,n,i){for(var s=0;s<n;s++)e[i+s]=t[r+s]},flattenChunks:function(e){return[].concat.apply([],e)}};r.setTyped=function(e){e?(r.Buf8=Uint8Array,r.Buf16=Uint16Array,r.Buf32=Int32Array,r.assign(r,i)):(r.Buf8=Array,r.Buf16=Array,r.Buf32=Array,r.assign(r,s))},r.setTyped(n)},{}],42:[function(e,t,r){"use strict";var h=e("./common"),i=!0,s=!0;try{String.fromCharCode.apply(null,[0])}catch(e){i=!1}try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){s=!1}for(var u=new h.Buf8(256),n=0;n<256;n++)u[n]=252<=n?6:248<=n?5:240<=n?4:224<=n?3:192<=n?2:1;function l(e,t){if(t<65537&&(e.subarray&&s||!e.subarray&&i))return String.fromCharCode.apply(null,h.shrinkBuf(e,t));for(var r="",n=0;n<t;n++)r+=String.fromCharCode(e[n]);return r}u[254]=u[254]=1,r.string2buf=function(e){var t,r,n,i,s,a=e.length,o=0;for(i=0;i<a;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),o+=r<128?1:r<2048?2:r<65536?3:4;for(t=new h.Buf8(o),i=s=0;s<o;i++)55296==(64512&(r=e.charCodeAt(i)))&&i+1<a&&56320==(64512&(n=e.charCodeAt(i+1)))&&(r=65536+(r-55296<<10)+(n-56320),i++),r<128?t[s++]=r:(r<2048?t[s++]=192|r>>>6:(r<65536?t[s++]=224|r>>>12:(t[s++]=240|r>>>18,t[s++]=128|r>>>12&63),t[s++]=128|r>>>6&63),t[s++]=128|63&r);return t},r.buf2binstring=function(e){return l(e,e.length)},r.binstring2buf=function(e){for(var t=new h.Buf8(e.length),r=0,n=t.length;r<n;r++)t[r]=e.charCodeAt(r);return t},r.buf2string=function(e,t){var r,n,i,s,a=t||e.length,o=new Array(2*a);for(r=n=0;r<a;)if((i=e[r++])<128)o[n++]=i;else if(4<(s=u[i]))o[n++]=65533,r+=s-1;else{for(i&=2===s?31:3===s?15:7;1<s&&r<a;)i=i<<6|63&e[r++],s--;1<s?o[n++]=65533:i<65536?o[n++]=i:(i-=65536,o[n++]=55296|i>>10&1023,o[n++]=56320|1023&i)}return l(o,n)},r.utf8border=function(e,t){var r;for((t=t||e.length)>e.length&&(t=e.length),r=t-1;0<=r&&128==(192&e[r]);)r--;return r<0?t:0===r?t:r+u[e[r]]>t?r:t}},{"./common":41}],43:[function(e,t,r){"use strict";t.exports=function(e,t,r,n){for(var i=65535&e|0,s=e>>>16&65535|0,a=0;0!==r;){for(r-=a=2e3<r?2e3:r;s=s+(i=i+t[n++]|0)|0,--a;);i%=65521,s%=65521}return i|s<<16|0}},{}],44:[function(e,t,r){"use strict";t.exports={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_ERRNO:-1,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_BUF_ERROR:-5,Z_NO_COMPRESSION:0,Z_BEST_SPEED:1,Z_BEST_COMPRESSION:9,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_BINARY:0,Z_TEXT:1,Z_UNKNOWN:2,Z_DEFLATED:8}},{}],45:[function(e,t,r){"use strict";var o=function(){for(var e,t=[],r=0;r<256;r++){e=r;for(var n=0;n<8;n++)e=1&e?3988292384^e>>>1:e>>>1;t[r]=e}return t}();t.exports=function(e,t,r,n){var i=o,s=n+r;e^=-1;for(var a=n;a<s;a++)e=e>>>8^i[255&(e^t[a])];return-1^e}},{}],46:[function(e,t,r){"use strict";var h,c=e("../utils/common"),u=e("./trees"),d=e("./adler32"),p=e("./crc32"),n=e("./messages"),l=0,f=4,m=0,_=-2,g=-1,b=4,i=2,v=8,y=9,s=286,a=30,o=19,w=2*s+1,k=15,x=3,S=258,z=S+x+1,C=42,E=113,A=1,I=2,O=3,B=4;function R(e,t){return e.msg=n[t],t}function T(e){return(e<<1)-(4<e?9:0)}function D(e){for(var t=e.length;0<=--t;)e[t]=0}function F(e){var t=e.state,r=t.pending;r>e.avail_out&&(r=e.avail_out),0!==r&&(c.arraySet(e.output,t.pending_buf,t.pending_out,r,e.next_out),e.next_out+=r,t.pending_out+=r,e.total_out+=r,e.avail_out-=r,t.pending-=r,0===t.pending&&(t.pending_out=0))}function N(e,t){u._tr_flush_block(e,0<=e.block_start?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,F(e.strm)}function U(e,t){e.pending_buf[e.pending++]=t}function P(e,t){e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t}function L(e,t){var r,n,i=e.max_chain_length,s=e.strstart,a=e.prev_length,o=e.nice_match,h=e.strstart>e.w_size-z?e.strstart-(e.w_size-z):0,u=e.window,l=e.w_mask,f=e.prev,c=e.strstart+S,d=u[s+a-1],p=u[s+a];e.prev_length>=e.good_match&&(i>>=2),o>e.lookahead&&(o=e.lookahead);do{if(u[(r=t)+a]===p&&u[r+a-1]===d&&u[r]===u[s]&&u[++r]===u[s+1]){s+=2,r++;do{}while(u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&u[++s]===u[++r]&&s<c);if(n=S-(c-s),s=c-S,a<n){if(e.match_start=t,o<=(a=n))break;d=u[s+a-1],p=u[s+a]}}}while((t=f[t&l])>h&&0!=--i);return a<=e.lookahead?a:e.lookahead}function j(e){var t,r,n,i,s,a,o,h,u,l,f=e.w_size;do{if(i=e.window_size-e.lookahead-e.strstart,e.strstart>=f+(f-z)){for(c.arraySet(e.window,e.window,f,f,0),e.match_start-=f,e.strstart-=f,e.block_start-=f,t=r=e.hash_size;n=e.head[--t],e.head[t]=f<=n?n-f:0,--r;);for(t=r=f;n=e.prev[--t],e.prev[t]=f<=n?n-f:0,--r;);i+=f}if(0===e.strm.avail_in)break;if(a=e.strm,o=e.window,h=e.strstart+e.lookahead,u=i,l=void 0,l=a.avail_in,u<l&&(l=u),r=0===l?0:(a.avail_in-=l,c.arraySet(o,a.input,a.next_in,l,h),1===a.state.wrap?a.adler=d(a.adler,o,l,h):2===a.state.wrap&&(a.adler=p(a.adler,o,l,h)),a.next_in+=l,a.total_in+=l,l),e.lookahead+=r,e.lookahead+e.insert>=x)for(s=e.strstart-e.insert,e.ins_h=e.window[s],e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+1])&e.hash_mask;e.insert&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[s+x-1])&e.hash_mask,e.prev[s&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=s,s++,e.insert--,!(e.lookahead+e.insert<x)););}while(e.lookahead<z&&0!==e.strm.avail_in)}function Z(e,t){for(var r,n;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==r&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r)),e.match_length>=x)if(n=u._tr_tally(e,e.strstart-e.match_start,e.match_length-x),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=x){for(e.match_length--;e.strstart++,e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart,0!=--e.match_length;);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+1])&e.hash_mask;else n=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(n&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function W(e,t){for(var r,n,i;;){if(e.lookahead<z){if(j(e),e.lookahead<z&&t===l)return A;if(0===e.lookahead)break}if(r=0,e.lookahead>=x&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=x-1,0!==r&&e.prev_length<e.max_lazy_match&&e.strstart-r<=e.w_size-z&&(e.match_length=L(e,r),e.match_length<=5&&(1===e.strategy||e.match_length===x&&4096<e.strstart-e.match_start)&&(e.match_length=x-1)),e.prev_length>=x&&e.match_length<=e.prev_length){for(i=e.strstart+e.lookahead-x,n=u._tr_tally(e,e.strstart-1-e.prev_match,e.prev_length-x),e.lookahead-=e.prev_length-1,e.prev_length-=2;++e.strstart<=i&&(e.ins_h=(e.ins_h<<e.hash_shift^e.window[e.strstart+x-1])&e.hash_mask,r=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!=--e.prev_length;);if(e.match_available=0,e.match_length=x-1,e.strstart++,n&&(N(e,!1),0===e.strm.avail_out))return A}else if(e.match_available){if((n=u._tr_tally(e,0,e.window[e.strstart-1]))&&N(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return A}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(n=u._tr_tally(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<x-1?e.strstart:x-1,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}function M(e,t,r,n,i){this.good_length=e,this.max_lazy=t,this.nice_length=r,this.max_chain=n,this.func=i}function H(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=v,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new c.Buf16(2*w),this.dyn_dtree=new c.Buf16(2*(2*a+1)),this.bl_tree=new c.Buf16(2*(2*o+1)),D(this.dyn_ltree),D(this.dyn_dtree),D(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new c.Buf16(k+1),this.heap=new c.Buf16(2*s+1),D(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new c.Buf16(2*s+1),D(this.depth),this.l_buf=0,this.lit_bufsize=0,this.last_lit=0,this.d_buf=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}function G(e){var t;return e&&e.state?(e.total_in=e.total_out=0,e.data_type=i,(t=e.state).pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=t.wrap?C:E,e.adler=2===t.wrap?0:1,t.last_flush=l,u._tr_init(t),m):R(e,_)}function K(e){var t=G(e);return t===m&&function(e){e.window_size=2*e.w_size,D(e.head),e.max_lazy_match=h[e.level].max_lazy,e.good_match=h[e.level].good_length,e.nice_match=h[e.level].nice_length,e.max_chain_length=h[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=x-1,e.match_available=0,e.ins_h=0}(e.state),t}function Y(e,t,r,n,i,s){if(!e)return _;var a=1;if(t===g&&(t=6),n<0?(a=0,n=-n):15<n&&(a=2,n-=16),i<1||y<i||r!==v||n<8||15<n||t<0||9<t||s<0||b<s)return R(e,_);8===n&&(n=9);var o=new H;return(e.state=o).strm=e,o.wrap=a,o.gzhead=null,o.w_bits=n,o.w_size=1<<o.w_bits,o.w_mask=o.w_size-1,o.hash_bits=i+7,o.hash_size=1<<o.hash_bits,o.hash_mask=o.hash_size-1,o.hash_shift=~~((o.hash_bits+x-1)/x),o.window=new c.Buf8(2*o.w_size),o.head=new c.Buf16(o.hash_size),o.prev=new c.Buf16(o.w_size),o.lit_bufsize=1<<i+6,o.pending_buf_size=4*o.lit_bufsize,o.pending_buf=new c.Buf8(o.pending_buf_size),o.d_buf=1*o.lit_bufsize,o.l_buf=3*o.lit_bufsize,o.level=t,o.strategy=s,o.method=r,K(e)}h=[new M(0,0,0,0,function(e,t){var r=65535;for(r>e.pending_buf_size-5&&(r=e.pending_buf_size-5);;){if(e.lookahead<=1){if(j(e),0===e.lookahead&&t===l)return A;if(0===e.lookahead)break}e.strstart+=e.lookahead,e.lookahead=0;var n=e.block_start+r;if((0===e.strstart||e.strstart>=n)&&(e.lookahead=e.strstart-n,e.strstart=n,N(e,!1),0===e.strm.avail_out))return A;if(e.strstart-e.block_start>=e.w_size-z&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):(e.strstart>e.block_start&&(N(e,!1),e.strm.avail_out),A)}),new M(4,4,8,4,Z),new M(4,5,16,8,Z),new M(4,6,32,32,Z),new M(4,4,16,16,W),new M(8,16,32,32,W),new M(8,16,128,128,W),new M(8,32,128,256,W),new M(32,128,258,1024,W),new M(32,258,258,4096,W)],r.deflateInit=function(e,t){return Y(e,t,v,15,8,0)},r.deflateInit2=Y,r.deflateReset=K,r.deflateResetKeep=G,r.deflateSetHeader=function(e,t){return e&&e.state?2!==e.state.wrap?_:(e.state.gzhead=t,m):_},r.deflate=function(e,t){var r,n,i,s;if(!e||!e.state||5<t||t<0)return e?R(e,_):_;if(n=e.state,!e.output||!e.input&&0!==e.avail_in||666===n.status&&t!==f)return R(e,0===e.avail_out?-5:_);if(n.strm=e,r=n.last_flush,n.last_flush=t,n.status===C)if(2===n.wrap)e.adler=0,U(n,31),U(n,139),U(n,8),n.gzhead?(U(n,(n.gzhead.text?1:0)+(n.gzhead.hcrc?2:0)+(n.gzhead.extra?4:0)+(n.gzhead.name?8:0)+(n.gzhead.comment?16:0)),U(n,255&n.gzhead.time),U(n,n.gzhead.time>>8&255),U(n,n.gzhead.time>>16&255),U(n,n.gzhead.time>>24&255),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,255&n.gzhead.os),n.gzhead.extra&&n.gzhead.extra.length&&(U(n,255&n.gzhead.extra.length),U(n,n.gzhead.extra.length>>8&255)),n.gzhead.hcrc&&(e.adler=p(e.adler,n.pending_buf,n.pending,0)),n.gzindex=0,n.status=69):(U(n,0),U(n,0),U(n,0),U(n,0),U(n,0),U(n,9===n.level?2:2<=n.strategy||n.level<2?4:0),U(n,3),n.status=E);else{var a=v+(n.w_bits-8<<4)<<8;a|=(2<=n.strategy||n.level<2?0:n.level<6?1:6===n.level?2:3)<<6,0!==n.strstart&&(a|=32),a+=31-a%31,n.status=E,P(n,a),0!==n.strstart&&(P(n,e.adler>>>16),P(n,65535&e.adler)),e.adler=1}if(69===n.status)if(n.gzhead.extra){for(i=n.pending;n.gzindex<(65535&n.gzhead.extra.length)&&(n.pending!==n.pending_buf_size||(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending!==n.pending_buf_size));)U(n,255&n.gzhead.extra[n.gzindex]),n.gzindex++;n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),n.gzindex===n.gzhead.extra.length&&(n.gzindex=0,n.status=73)}else n.status=73;if(73===n.status)if(n.gzhead.name){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.name.length?255&n.gzhead.name.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.gzindex=0,n.status=91)}else n.status=91;if(91===n.status)if(n.gzhead.comment){i=n.pending;do{if(n.pending===n.pending_buf_size&&(n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),F(e),i=n.pending,n.pending===n.pending_buf_size)){s=1;break}s=n.gzindex<n.gzhead.comment.length?255&n.gzhead.comment.charCodeAt(n.gzindex++):0,U(n,s)}while(0!==s);n.gzhead.hcrc&&n.pending>i&&(e.adler=p(e.adler,n.pending_buf,n.pending-i,i)),0===s&&(n.status=103)}else n.status=103;if(103===n.status&&(n.gzhead.hcrc?(n.pending+2>n.pending_buf_size&&F(e),n.pending+2<=n.pending_buf_size&&(U(n,255&e.adler),U(n,e.adler>>8&255),e.adler=0,n.status=E)):n.status=E),0!==n.pending){if(F(e),0===e.avail_out)return n.last_flush=-1,m}else if(0===e.avail_in&&T(t)<=T(r)&&t!==f)return R(e,-5);if(666===n.status&&0!==e.avail_in)return R(e,-5);if(0!==e.avail_in||0!==n.lookahead||t!==l&&666!==n.status){var o=2===n.strategy?function(e,t){for(var r;;){if(0===e.lookahead&&(j(e),0===e.lookahead)){if(t===l)return A;break}if(e.match_length=0,r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):3===n.strategy?function(e,t){for(var r,n,i,s,a=e.window;;){if(e.lookahead<=S){if(j(e),e.lookahead<=S&&t===l)return A;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=x&&0<e.strstart&&(n=a[i=e.strstart-1])===a[++i]&&n===a[++i]&&n===a[++i]){s=e.strstart+S;do{}while(n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&n===a[++i]&&i<s);e.match_length=S-(s-i),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=x?(r=u._tr_tally(e,1,e.match_length-x),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(r=u._tr_tally(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),r&&(N(e,!1),0===e.strm.avail_out))return A}return e.insert=0,t===f?(N(e,!0),0===e.strm.avail_out?O:B):e.last_lit&&(N(e,!1),0===e.strm.avail_out)?A:I}(n,t):h[n.level].func(n,t);if(o!==O&&o!==B||(n.status=666),o===A||o===O)return 0===e.avail_out&&(n.last_flush=-1),m;if(o===I&&(1===t?u._tr_align(n):5!==t&&(u._tr_stored_block(n,0,0,!1),3===t&&(D(n.head),0===n.lookahead&&(n.strstart=0,n.block_start=0,n.insert=0))),F(e),0===e.avail_out))return n.last_flush=-1,m}return t!==f?m:n.wrap<=0?1:(2===n.wrap?(U(n,255&e.adler),U(n,e.adler>>8&255),U(n,e.adler>>16&255),U(n,e.adler>>24&255),U(n,255&e.total_in),U(n,e.total_in>>8&255),U(n,e.total_in>>16&255),U(n,e.total_in>>24&255)):(P(n,e.adler>>>16),P(n,65535&e.adler)),F(e),0<n.wrap&&(n.wrap=-n.wrap),0!==n.pending?m:1)},r.deflateEnd=function(e){var t;return e&&e.state?(t=e.state.status)!==C&&69!==t&&73!==t&&91!==t&&103!==t&&t!==E&&666!==t?R(e,_):(e.state=null,t===E?R(e,-3):m):_},r.deflateSetDictionary=function(e,t){var r,n,i,s,a,o,h,u,l=t.length;if(!e||!e.state)return _;if(2===(s=(r=e.state).wrap)||1===s&&r.status!==C||r.lookahead)return _;for(1===s&&(e.adler=d(e.adler,t,l,0)),r.wrap=0,l>=r.w_size&&(0===s&&(D(r.head),r.strstart=0,r.block_start=0,r.insert=0),u=new c.Buf8(r.w_size),c.arraySet(u,t,l-r.w_size,r.w_size,0),t=u,l=r.w_size),a=e.avail_in,o=e.next_in,h=e.input,e.avail_in=l,e.next_in=0,e.input=t,j(r);r.lookahead>=x;){for(n=r.strstart,i=r.lookahead-(x-1);r.ins_h=(r.ins_h<<r.hash_shift^r.window[n+x-1])&r.hash_mask,r.prev[n&r.w_mask]=r.head[r.ins_h],r.head[r.ins_h]=n,n++,--i;);r.strstart=n,r.lookahead=x-1,j(r)}return r.strstart+=r.lookahead,r.block_start=r.strstart,r.insert=r.lookahead,r.lookahead=0,r.match_length=r.prev_length=x-1,r.match_available=0,e.next_in=o,e.input=h,e.avail_in=a,r.wrap=s,m},r.deflateInfo="pako deflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./messages":51,"./trees":52}],47:[function(e,t,r){"use strict";t.exports=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1}},{}],48:[function(e,t,r){"use strict";t.exports=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C;r=e.state,n=e.next_in,z=e.input,i=n+(e.avail_in-5),s=e.next_out,C=e.output,a=s-(t-e.avail_out),o=s+(e.avail_out-257),h=r.dmax,u=r.wsize,l=r.whave,f=r.wnext,c=r.window,d=r.hold,p=r.bits,m=r.lencode,_=r.distcode,g=(1<<r.lenbits)-1,b=(1<<r.distbits)-1;e:do{p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=m[d&g];t:for(;;){if(d>>>=y=v>>>24,p-=y,0===(y=v>>>16&255))C[s++]=65535&v;else{if(!(16&y)){if(0==(64&y)){v=m[(65535&v)+(d&(1<<y)-1)];continue t}if(32&y){r.mode=12;break e}e.msg="invalid literal/length code",r.mode=30;break e}w=65535&v,(y&=15)&&(p<y&&(d+=z[n++]<<p,p+=8),w+=d&(1<<y)-1,d>>>=y,p-=y),p<15&&(d+=z[n++]<<p,p+=8,d+=z[n++]<<p,p+=8),v=_[d&b];r:for(;;){if(d>>>=y=v>>>24,p-=y,!(16&(y=v>>>16&255))){if(0==(64&y)){v=_[(65535&v)+(d&(1<<y)-1)];continue r}e.msg="invalid distance code",r.mode=30;break e}if(k=65535&v,p<(y&=15)&&(d+=z[n++]<<p,(p+=8)<y&&(d+=z[n++]<<p,p+=8)),h<(k+=d&(1<<y)-1)){e.msg="invalid distance too far back",r.mode=30;break e}if(d>>>=y,p-=y,(y=s-a)<k){if(l<(y=k-y)&&r.sane){e.msg="invalid distance too far back",r.mode=30;break e}if(S=c,(x=0)===f){if(x+=u-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}}else if(f<y){if(x+=u+f-y,(y-=f)<w){for(w-=y;C[s++]=c[x++],--y;);if(x=0,f<w){for(w-=y=f;C[s++]=c[x++],--y;);x=s-k,S=C}}}else if(x+=f-y,y<w){for(w-=y;C[s++]=c[x++],--y;);x=s-k,S=C}for(;2<w;)C[s++]=S[x++],C[s++]=S[x++],C[s++]=S[x++],w-=3;w&&(C[s++]=S[x++],1<w&&(C[s++]=S[x++]))}else{for(x=s-k;C[s++]=C[x++],C[s++]=C[x++],C[s++]=C[x++],2<(w-=3););w&&(C[s++]=C[x++],1<w&&(C[s++]=C[x++]))}break}}break}}while(n<i&&s<o);n-=w=p>>3,d&=(1<<(p-=w<<3))-1,e.next_in=n,e.next_out=s,e.avail_in=n<i?i-n+5:5-(n-i),e.avail_out=s<o?o-s+257:257-(s-o),r.hold=d,r.bits=p}},{}],49:[function(e,t,r){"use strict";var I=e("../utils/common"),O=e("./adler32"),B=e("./crc32"),R=e("./inffast"),T=e("./inftrees"),D=1,F=2,N=0,U=-2,P=1,n=852,i=592;function L(e){return(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24)}function s(){this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new I.Buf16(320),this.work=new I.Buf16(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}function a(e){var t;return e&&e.state?(t=e.state,e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=P,t.last=0,t.havedict=0,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new I.Buf32(n),t.distcode=t.distdyn=new I.Buf32(i),t.sane=1,t.back=-1,N):U}function o(e){var t;return e&&e.state?((t=e.state).wsize=0,t.whave=0,t.wnext=0,a(e)):U}function h(e,t){var r,n;return e&&e.state?(n=e.state,t<0?(r=0,t=-t):(r=1+(t>>4),t<48&&(t&=15)),t&&(t<8||15<t)?U:(null!==n.window&&n.wbits!==t&&(n.window=null),n.wrap=r,n.wbits=t,o(e))):U}function u(e,t){var r,n;return e?(n=new s,(e.state=n).window=null,(r=h(e,t))!==N&&(e.state=null),r):U}var l,f,c=!0;function j(e){if(c){var t;for(l=new I.Buf32(512),f=new I.Buf32(32),t=0;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(T(D,e.lens,0,288,l,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;T(F,e.lens,0,32,f,0,e.work,{bits:5}),c=!1}e.lencode=l,e.lenbits=9,e.distcode=f,e.distbits=5}function Z(e,t,r,n){var i,s=e.state;return null===s.window&&(s.wsize=1<<s.wbits,s.wnext=0,s.whave=0,s.window=new I.Buf8(s.wsize)),n>=s.wsize?(I.arraySet(s.window,t,r-s.wsize,s.wsize,0),s.wnext=0,s.whave=s.wsize):(n<(i=s.wsize-s.wnext)&&(i=n),I.arraySet(s.window,t,r-n,i,s.wnext),(n-=i)?(I.arraySet(s.window,t,r-n,n,0),s.wnext=n,s.whave=s.wsize):(s.wnext+=i,s.wnext===s.wsize&&(s.wnext=0),s.whave<s.wsize&&(s.whave+=i))),0}r.inflateReset=o,r.inflateReset2=h,r.inflateResetKeep=a,r.inflateInit=function(e){return u(e,15)},r.inflateInit2=u,r.inflate=function(e,t){var r,n,i,s,a,o,h,u,l,f,c,d,p,m,_,g,b,v,y,w,k,x,S,z,C=0,E=new I.Buf8(4),A=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];if(!e||!e.state||!e.output||!e.input&&0!==e.avail_in)return U;12===(r=e.state).mode&&(r.mode=13),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,f=o,c=h,x=N;e:for(;;)switch(r.mode){case P:if(0===r.wrap){r.mode=13;break}for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(2&r.wrap&&35615===u){E[r.check=0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0),l=u=0,r.mode=2;break}if(r.flags=0,r.head&&(r.head.done=!1),!(1&r.wrap)||(((255&u)<<8)+(u>>8))%31){e.msg="incorrect header check",r.mode=30;break}if(8!=(15&u)){e.msg="unknown compression method",r.mode=30;break}if(l-=4,k=8+(15&(u>>>=4)),0===r.wbits)r.wbits=k;else if(k>r.wbits){e.msg="invalid window size",r.mode=30;break}r.dmax=1<<k,e.adler=r.check=1,r.mode=512&u?10:12,l=u=0;break;case 2:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.flags=u,8!=(255&r.flags)){e.msg="unknown compression method",r.mode=30;break}if(57344&r.flags){e.msg="unknown header flags set",r.mode=30;break}r.head&&(r.head.text=u>>8&1),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=3;case 3:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.time=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,E[2]=u>>>16&255,E[3]=u>>>24&255,r.check=B(r.check,E,4,0)),l=u=0,r.mode=4;case 4:for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.head&&(r.head.xflags=255&u,r.head.os=u>>8),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0,r.mode=5;case 5:if(1024&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length=u,r.head&&(r.head.extra_len=u),512&r.flags&&(E[0]=255&u,E[1]=u>>>8&255,r.check=B(r.check,E,2,0)),l=u=0}else r.head&&(r.head.extra=null);r.mode=6;case 6:if(1024&r.flags&&(o<(d=r.length)&&(d=o),d&&(r.head&&(k=r.head.extra_len-r.length,r.head.extra||(r.head.extra=new Array(r.head.extra_len)),I.arraySet(r.head.extra,n,s,d,k)),512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,r.length-=d),r.length))break e;r.length=0,r.mode=7;case 7:if(2048&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.name+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.name=null);r.length=0,r.mode=8;case 8:if(4096&r.flags){if(0===o)break e;for(d=0;k=n[s+d++],r.head&&k&&r.length<65536&&(r.head.comment+=String.fromCharCode(k)),k&&d<o;);if(512&r.flags&&(r.check=B(r.check,n,d,s)),o-=d,s+=d,k)break e}else r.head&&(r.head.comment=null);r.mode=9;case 9:if(512&r.flags){for(;l<16;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(65535&r.check)){e.msg="header crc mismatch",r.mode=30;break}l=u=0}r.head&&(r.head.hcrc=r.flags>>9&1,r.head.done=!0),e.adler=r.check=0,r.mode=12;break;case 10:for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}e.adler=r.check=L(u),l=u=0,r.mode=11;case 11:if(0===r.havedict)return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,2;e.adler=r.check=1,r.mode=12;case 12:if(5===t||6===t)break e;case 13:if(r.last){u>>>=7&l,l-=7&l,r.mode=27;break}for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}switch(r.last=1&u,l-=1,3&(u>>>=1)){case 0:r.mode=14;break;case 1:if(j(r),r.mode=20,6!==t)break;u>>>=2,l-=2;break e;case 2:r.mode=17;break;case 3:e.msg="invalid block type",r.mode=30}u>>>=2,l-=2;break;case 14:for(u>>>=7&l,l-=7&l;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if((65535&u)!=(u>>>16^65535)){e.msg="invalid stored block lengths",r.mode=30;break}if(r.length=65535&u,l=u=0,r.mode=15,6===t)break e;case 15:r.mode=16;case 16:if(d=r.length){if(o<d&&(d=o),h<d&&(d=h),0===d)break e;I.arraySet(i,n,s,d,a),o-=d,s+=d,h-=d,a+=d,r.length-=d;break}r.mode=12;break;case 17:for(;l<14;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(r.nlen=257+(31&u),u>>>=5,l-=5,r.ndist=1+(31&u),u>>>=5,l-=5,r.ncode=4+(15&u),u>>>=4,l-=4,286<r.nlen||30<r.ndist){e.msg="too many length or distance symbols",r.mode=30;break}r.have=0,r.mode=18;case 18:for(;r.have<r.ncode;){for(;l<3;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.lens[A[r.have++]]=7&u,u>>>=3,l-=3}for(;r.have<19;)r.lens[A[r.have++]]=0;if(r.lencode=r.lendyn,r.lenbits=7,S={bits:r.lenbits},x=T(0,r.lens,0,19,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid code lengths set",r.mode=30;break}r.have=0,r.mode=19;case 19:for(;r.have<r.nlen+r.ndist;){for(;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(b<16)u>>>=_,l-=_,r.lens[r.have++]=b;else{if(16===b){for(z=_+2;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u>>>=_,l-=_,0===r.have){e.msg="invalid bit length repeat",r.mode=30;break}k=r.lens[r.have-1],d=3+(3&u),u>>>=2,l-=2}else if(17===b){for(z=_+3;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=3+(7&(u>>>=_)),u>>>=3,l-=3}else{for(z=_+7;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}l-=_,k=0,d=11+(127&(u>>>=_)),u>>>=7,l-=7}if(r.have+d>r.nlen+r.ndist){e.msg="invalid bit length repeat",r.mode=30;break}for(;d--;)r.lens[r.have++]=k}}if(30===r.mode)break;if(0===r.lens[256]){e.msg="invalid code -- missing end-of-block",r.mode=30;break}if(r.lenbits=9,S={bits:r.lenbits},x=T(D,r.lens,0,r.nlen,r.lencode,0,r.work,S),r.lenbits=S.bits,x){e.msg="invalid literal/lengths set",r.mode=30;break}if(r.distbits=6,r.distcode=r.distdyn,S={bits:r.distbits},x=T(F,r.lens,r.nlen,r.ndist,r.distcode,0,r.work,S),r.distbits=S.bits,x){e.msg="invalid distances set",r.mode=30;break}if(r.mode=20,6===t)break e;case 20:r.mode=21;case 21:if(6<=o&&258<=h){e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,R(e,c),a=e.next_out,i=e.output,h=e.avail_out,s=e.next_in,n=e.input,o=e.avail_in,u=r.hold,l=r.bits,12===r.mode&&(r.back=-1);break}for(r.back=0;g=(C=r.lencode[u&(1<<r.lenbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(g&&0==(240&g)){for(v=_,y=g,w=b;g=(C=r.lencode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,r.length=b,0===g){r.mode=26;break}if(32&g){r.back=-1,r.mode=12;break}if(64&g){e.msg="invalid literal/length code",r.mode=30;break}r.extra=15&g,r.mode=22;case 22:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.length+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}r.was=r.length,r.mode=23;case 23:for(;g=(C=r.distcode[u&(1<<r.distbits)-1])>>>16&255,b=65535&C,!((_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(0==(240&g)){for(v=_,y=g,w=b;g=(C=r.distcode[w+((u&(1<<v+y)-1)>>v)])>>>16&255,b=65535&C,!(v+(_=C>>>24)<=l);){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}u>>>=v,l-=v,r.back+=v}if(u>>>=_,l-=_,r.back+=_,64&g){e.msg="invalid distance code",r.mode=30;break}r.offset=b,r.extra=15&g,r.mode=24;case 24:if(r.extra){for(z=r.extra;l<z;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}r.offset+=u&(1<<r.extra)-1,u>>>=r.extra,l-=r.extra,r.back+=r.extra}if(r.offset>r.dmax){e.msg="invalid distance too far back",r.mode=30;break}r.mode=25;case 25:if(0===h)break e;if(d=c-h,r.offset>d){if((d=r.offset-d)>r.whave&&r.sane){e.msg="invalid distance too far back",r.mode=30;break}p=d>r.wnext?(d-=r.wnext,r.wsize-d):r.wnext-d,d>r.length&&(d=r.length),m=r.window}else m=i,p=a-r.offset,d=r.length;for(h<d&&(d=h),h-=d,r.length-=d;i[a++]=m[p++],--d;);0===r.length&&(r.mode=21);break;case 26:if(0===h)break e;i[a++]=r.length,h--,r.mode=21;break;case 27:if(r.wrap){for(;l<32;){if(0===o)break e;o--,u|=n[s++]<<l,l+=8}if(c-=h,e.total_out+=c,r.total+=c,c&&(e.adler=r.check=r.flags?B(r.check,i,c,a-c):O(r.check,i,c,a-c)),c=h,(r.flags?u:L(u))!==r.check){e.msg="incorrect data check",r.mode=30;break}l=u=0}r.mode=28;case 28:if(r.wrap&&r.flags){for(;l<32;){if(0===o)break e;o--,u+=n[s++]<<l,l+=8}if(u!==(4294967295&r.total)){e.msg="incorrect length check",r.mode=30;break}l=u=0}r.mode=29;case 29:x=1;break e;case 30:x=-3;break e;case 31:return-4;case 32:default:return U}return e.next_out=a,e.avail_out=h,e.next_in=s,e.avail_in=o,r.hold=u,r.bits=l,(r.wsize||c!==e.avail_out&&r.mode<30&&(r.mode<27||4!==t))&&Z(e,e.output,e.next_out,c-e.avail_out)?(r.mode=31,-4):(f-=e.avail_in,c-=e.avail_out,e.total_in+=f,e.total_out+=c,r.total+=c,r.wrap&&c&&(e.adler=r.check=r.flags?B(r.check,i,c,e.next_out-c):O(r.check,i,c,e.next_out-c)),e.data_type=r.bits+(r.last?64:0)+(12===r.mode?128:0)+(20===r.mode||15===r.mode?256:0),(0==f&&0===c||4===t)&&x===N&&(x=-5),x)},r.inflateEnd=function(e){if(!e||!e.state)return U;var t=e.state;return t.window&&(t.window=null),e.state=null,N},r.inflateGetHeader=function(e,t){var r;return e&&e.state?0==(2&(r=e.state).wrap)?U:((r.head=t).done=!1,N):U},r.inflateSetDictionary=function(e,t){var r,n=t.length;return e&&e.state?0!==(r=e.state).wrap&&11!==r.mode?U:11===r.mode&&O(1,t,n,0)!==r.check?-3:Z(e,t,n,n)?(r.mode=31,-4):(r.havedict=1,N):U},r.inflateInfo="pako inflate (from Nodeca project)"},{"../utils/common":41,"./adler32":43,"./crc32":45,"./inffast":48,"./inftrees":50}],50:[function(e,t,r){"use strict";var D=e("../utils/common"),F=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0],N=[16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78],U=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0],P=[16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64];t.exports=function(e,t,r,n,i,s,a,o){var h,u,l,f,c,d,p,m,_,g=o.bits,b=0,v=0,y=0,w=0,k=0,x=0,S=0,z=0,C=0,E=0,A=null,I=0,O=new D.Buf16(16),B=new D.Buf16(16),R=null,T=0;for(b=0;b<=15;b++)O[b]=0;for(v=0;v<n;v++)O[t[r+v]]++;for(k=g,w=15;1<=w&&0===O[w];w--);if(w<k&&(k=w),0===w)return i[s++]=20971520,i[s++]=20971520,o.bits=1,0;for(y=1;y<w&&0===O[y];y++);for(k<y&&(k=y),b=z=1;b<=15;b++)if(z<<=1,(z-=O[b])<0)return-1;if(0<z&&(0===e||1!==w))return-1;for(B[1]=0,b=1;b<15;b++)B[b+1]=B[b]+O[b];for(v=0;v<n;v++)0!==t[r+v]&&(a[B[t[r+v]]++]=v);if(d=0===e?(A=R=a,19):1===e?(A=F,I-=257,R=N,T-=257,256):(A=U,R=P,-1),b=y,c=s,S=v=E=0,l=-1,f=(C=1<<(x=k))-1,1===e&&852<C||2===e&&592<C)return 1;for(;;){for(p=b-S,_=a[v]<d?(m=0,a[v]):a[v]>d?(m=R[T+a[v]],A[I+a[v]]):(m=96,0),h=1<<b-S,y=u=1<<x;i[c+(E>>S)+(u-=h)]=p<<24|m<<16|_|0,0!==u;);for(h=1<<b-1;E&h;)h>>=1;if(0!==h?(E&=h-1,E+=h):E=0,v++,0==--O[b]){if(b===w)break;b=t[r+a[v]]}if(k<b&&(E&f)!==l){for(0===S&&(S=k),c+=y,z=1<<(x=b-S);x+S<w&&!((z-=O[x+S])<=0);)x++,z<<=1;if(C+=1<<x,1===e&&852<C||2===e&&592<C)return 1;i[l=E&f]=k<<24|x<<16|c-s|0}}return 0!==E&&(i[c+E]=b-S<<24|64<<16|0),o.bits=k,0}},{"../utils/common":41}],51:[function(e,t,r){"use strict";t.exports={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"}},{}],52:[function(e,t,r){"use strict";var i=e("../utils/common"),o=0,h=1;function n(e){for(var t=e.length;0<=--t;)e[t]=0}var s=0,a=29,u=256,l=u+1+a,f=30,c=19,_=2*l+1,g=15,d=16,p=7,m=256,b=16,v=17,y=18,w=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0],k=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13],x=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7],S=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],z=new Array(2*(l+2));n(z);var C=new Array(2*f);n(C);var E=new Array(512);n(E);var A=new Array(256);n(A);var I=new Array(a);n(I);var O,B,R,T=new Array(f);function D(e,t,r,n,i){this.static_tree=e,this.extra_bits=t,this.extra_base=r,this.elems=n,this.max_length=i,this.has_stree=e&&e.length}function F(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}function N(e){return e<256?E[e]:E[256+(e>>>7)]}function U(e,t){e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255}function P(e,t,r){e.bi_valid>d-r?(e.bi_buf|=t<<e.bi_valid&65535,U(e,e.bi_buf),e.bi_buf=t>>d-e.bi_valid,e.bi_valid+=r-d):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=r)}function L(e,t,r){P(e,r[2*t],r[2*t+1])}function j(e,t){for(var r=0;r|=1&e,e>>>=1,r<<=1,0<--t;);return r>>>1}function Z(e,t,r){var n,i,s=new Array(g+1),a=0;for(n=1;n<=g;n++)s[n]=a=a+r[n-1]<<1;for(i=0;i<=t;i++){var o=e[2*i+1];0!==o&&(e[2*i]=j(s[o]++,o))}}function W(e){var t;for(t=0;t<l;t++)e.dyn_ltree[2*t]=0;for(t=0;t<f;t++)e.dyn_dtree[2*t]=0;for(t=0;t<c;t++)e.bl_tree[2*t]=0;e.dyn_ltree[2*m]=1,e.opt_len=e.static_len=0,e.last_lit=e.matches=0}function M(e){8<e.bi_valid?U(e,e.bi_buf):0<e.bi_valid&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0}function H(e,t,r,n){var i=2*t,s=2*r;return e[i]<e[s]||e[i]===e[s]&&n[t]<=n[r]}function G(e,t,r){for(var n=e.heap[r],i=r<<1;i<=e.heap_len&&(i<e.heap_len&&H(t,e.heap[i+1],e.heap[i],e.depth)&&i++,!H(t,n,e.heap[i],e.depth));)e.heap[r]=e.heap[i],r=i,i<<=1;e.heap[r]=n}function K(e,t,r){var n,i,s,a,o=0;if(0!==e.last_lit)for(;n=e.pending_buf[e.d_buf+2*o]<<8|e.pending_buf[e.d_buf+2*o+1],i=e.pending_buf[e.l_buf+o],o++,0===n?L(e,i,t):(L(e,(s=A[i])+u+1,t),0!==(a=w[s])&&P(e,i-=I[s],a),L(e,s=N(--n),r),0!==(a=k[s])&&P(e,n-=T[s],a)),o<e.last_lit;);L(e,m,t)}function Y(e,t){var r,n,i,s=t.dyn_tree,a=t.stat_desc.static_tree,o=t.stat_desc.has_stree,h=t.stat_desc.elems,u=-1;for(e.heap_len=0,e.heap_max=_,r=0;r<h;r++)0!==s[2*r]?(e.heap[++e.heap_len]=u=r,e.depth[r]=0):s[2*r+1]=0;for(;e.heap_len<2;)s[2*(i=e.heap[++e.heap_len]=u<2?++u:0)]=1,e.depth[i]=0,e.opt_len--,o&&(e.static_len-=a[2*i+1]);for(t.max_code=u,r=e.heap_len>>1;1<=r;r--)G(e,s,r);for(i=h;r=e.heap[1],e.heap[1]=e.heap[e.heap_len--],G(e,s,1),n=e.heap[1],e.heap[--e.heap_max]=r,e.heap[--e.heap_max]=n,s[2*i]=s[2*r]+s[2*n],e.depth[i]=(e.depth[r]>=e.depth[n]?e.depth[r]:e.depth[n])+1,s[2*r+1]=s[2*n+1]=i,e.heap[1]=i++,G(e,s,1),2<=e.heap_len;);e.heap[--e.heap_max]=e.heap[1],function(e,t){var r,n,i,s,a,o,h=t.dyn_tree,u=t.max_code,l=t.stat_desc.static_tree,f=t.stat_desc.has_stree,c=t.stat_desc.extra_bits,d=t.stat_desc.extra_base,p=t.stat_desc.max_length,m=0;for(s=0;s<=g;s++)e.bl_count[s]=0;for(h[2*e.heap[e.heap_max]+1]=0,r=e.heap_max+1;r<_;r++)p<(s=h[2*h[2*(n=e.heap[r])+1]+1]+1)&&(s=p,m++),h[2*n+1]=s,u<n||(e.bl_count[s]++,a=0,d<=n&&(a=c[n-d]),o=h[2*n],e.opt_len+=o*(s+a),f&&(e.static_len+=o*(l[2*n+1]+a)));if(0!==m){do{for(s=p-1;0===e.bl_count[s];)s--;e.bl_count[s]--,e.bl_count[s+1]+=2,e.bl_count[p]--,m-=2}while(0<m);for(s=p;0!==s;s--)for(n=e.bl_count[s];0!==n;)u<(i=e.heap[--r])||(h[2*i+1]!==s&&(e.opt_len+=(s-h[2*i+1])*h[2*i],h[2*i+1]=s),n--)}}(e,t),Z(s,u,e.bl_count)}function X(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),t[2*(r+1)+1]=65535,n=0;n<=r;n++)i=a,a=t[2*(n+1)+1],++o<h&&i===a||(o<u?e.bl_tree[2*i]+=o:0!==i?(i!==s&&e.bl_tree[2*i]++,e.bl_tree[2*b]++):o<=10?e.bl_tree[2*v]++:e.bl_tree[2*y]++,s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4))}function V(e,t,r){var n,i,s=-1,a=t[1],o=0,h=7,u=4;for(0===a&&(h=138,u=3),n=0;n<=r;n++)if(i=a,a=t[2*(n+1)+1],!(++o<h&&i===a)){if(o<u)for(;L(e,i,e.bl_tree),0!=--o;);else 0!==i?(i!==s&&(L(e,i,e.bl_tree),o--),L(e,b,e.bl_tree),P(e,o-3,2)):o<=10?(L(e,v,e.bl_tree),P(e,o-3,3)):(L(e,y,e.bl_tree),P(e,o-11,7));s=i,u=(o=0)===a?(h=138,3):i===a?(h=6,3):(h=7,4)}}n(T);var q=!1;function J(e,t,r,n){P(e,(s<<1)+(n?1:0),3),function(e,t,r,n){M(e),n&&(U(e,r),U(e,~r)),i.arraySet(e.pending_buf,e.window,t,r,e.pending),e.pending+=r}(e,t,r,!0)}r._tr_init=function(e){q||(function(){var e,t,r,n,i,s=new Array(g+1);for(n=r=0;n<a-1;n++)for(I[n]=r,e=0;e<1<<w[n];e++)A[r++]=n;for(A[r-1]=n,n=i=0;n<16;n++)for(T[n]=i,e=0;e<1<<k[n];e++)E[i++]=n;for(i>>=7;n<f;n++)for(T[n]=i<<7,e=0;e<1<<k[n]-7;e++)E[256+i++]=n;for(t=0;t<=g;t++)s[t]=0;for(e=0;e<=143;)z[2*e+1]=8,e++,s[8]++;for(;e<=255;)z[2*e+1]=9,e++,s[9]++;for(;e<=279;)z[2*e+1]=7,e++,s[7]++;for(;e<=287;)z[2*e+1]=8,e++,s[8]++;for(Z(z,l+1,s),e=0;e<f;e++)C[2*e+1]=5,C[2*e]=j(e,5);O=new D(z,w,u+1,l,g),B=new D(C,k,0,f,g),R=new D(new Array(0),x,0,c,p)}(),q=!0),e.l_desc=new F(e.dyn_ltree,O),e.d_desc=new F(e.dyn_dtree,B),e.bl_desc=new F(e.bl_tree,R),e.bi_buf=0,e.bi_valid=0,W(e)},r._tr_stored_block=J,r._tr_flush_block=function(e,t,r,n){var i,s,a=0;0<e.level?(2===e.strm.data_type&&(e.strm.data_type=function(e){var t,r=4093624447;for(t=0;t<=31;t++,r>>>=1)if(1&r&&0!==e.dyn_ltree[2*t])return o;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return h;for(t=32;t<u;t++)if(0!==e.dyn_ltree[2*t])return h;return o}(e)),Y(e,e.l_desc),Y(e,e.d_desc),a=function(e){var t;for(X(e,e.dyn_ltree,e.l_desc.max_code),X(e,e.dyn_dtree,e.d_desc.max_code),Y(e,e.bl_desc),t=c-1;3<=t&&0===e.bl_tree[2*S[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t}(e),i=e.opt_len+3+7>>>3,(s=e.static_len+3+7>>>3)<=i&&(i=s)):i=s=r+5,r+4<=i&&-1!==t?J(e,t,r,n):4===e.strategy||s===i?(P(e,2+(n?1:0),3),K(e,z,C)):(P(e,4+(n?1:0),3),function(e,t,r,n){var i;for(P(e,t-257,5),P(e,r-1,5),P(e,n-4,4),i=0;i<n;i++)P(e,e.bl_tree[2*S[i]+1],3);V(e,e.dyn_ltree,t-1),V(e,e.dyn_dtree,r-1)}(e,e.l_desc.max_code+1,e.d_desc.max_code+1,a+1),K(e,e.dyn_ltree,e.dyn_dtree)),W(e),n&&M(e)},r._tr_tally=function(e,t,r){return e.pending_buf[e.d_buf+2*e.last_lit]=t>>>8&255,e.pending_buf[e.d_buf+2*e.last_lit+1]=255&t,e.pending_buf[e.l_buf+e.last_lit]=255&r,e.last_lit++,0===t?e.dyn_ltree[2*r]++:(e.matches++,t--,e.dyn_ltree[2*(A[r]+u+1)]++,e.dyn_dtree[2*N(t)]++),e.last_lit===e.lit_bufsize-1},r._tr_align=function(e){P(e,2,3),L(e,m,z),function(e){16===e.bi_valid?(U(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):8<=e.bi_valid&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)}(e)}},{"../utils/common":41}],53:[function(e,t,r){"use strict";t.exports=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0}},{}],54:[function(e,t,r){(function(e){!function(r,n){"use strict";if(!r.setImmediate){var i,s,t,a,o=1,h={},u=!1,l=r.document,e=Object.getPrototypeOf&&Object.getPrototypeOf(r);e=e&&e.setTimeout?e:r,i="[object process]"==={}.toString.call(r.process)?function(e){process.nextTick(function(){c(e)})}:function(){if(r.postMessage&&!r.importScripts){var e=!0,t=r.onmessage;return r.onmessage=function(){e=!1},r.postMessage("","*"),r.onmessage=t,e}}()?(a="setImmediate$"+Math.random()+"$",r.addEventListener?r.addEventListener("message",d,!1):r.attachEvent("onmessage",d),function(e){r.postMessage(a+e,"*")}):r.MessageChannel?((t=new MessageChannel).port1.onmessage=function(e){c(e.data)},function(e){t.port2.postMessage(e)}):l&&"onreadystatechange"in l.createElement("script")?(s=l.documentElement,function(e){var t=l.createElement("script");t.onreadystatechange=function(){c(e),t.onreadystatechange=null,s.removeChild(t),t=null},s.appendChild(t)}):function(e){setTimeout(c,0,e)},e.setImmediate=function(e){"function"!=typeof e&&(e=new Function(""+e));for(var t=new Array(arguments.length-1),r=0;r<t.length;r++)t[r]=arguments[r+1];var n={callback:e,args:t};return h[o]=n,i(o),o++},e.clearImmediate=f}function f(e){delete h[e]}function c(e){if(u)setTimeout(c,0,e);else{var t=h[e];if(t){u=!0;try{!function(e){var t=e.callback,r=e.args;switch(r.length){case 0:t();break;case 1:t(r[0]);break;case 2:t(r[0],r[1]);break;case 3:t(r[0],r[1],r[2]);break;default:t.apply(n,r)}}(t)}finally{f(e),u=!1}}}}function d(e){e.source===r&&"string"==typeof e.data&&0===e.data.indexOf(a)&&c(+e.data.slice(a.length))}}("undefined"==typeof self?void 0===e?this:e:self)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}]},{},[10])(10)});
/*
 * Название и версия продукта — одно место на всё: шапка, окно «О детекторе»,
 * отчёт для заказчика, Word, JSON, консольная проверка check.js.
 * Каждое изменение — новая версия здесь и запись в CHANGELOG.md.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  if (root) { root.DetectorVersion = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var V = {
    name: 'ИИ Детектор Пылова',
    version: '2.1',
    date: '23 сентября 2026',
    // коротко — для окна «О детекторе»; подробно — в CHANGELOG.md
    changes: [
      { v: '2.1', date: '23.09.2026', items: [
        'Название — «ИИ Детектор Пылова»',
        'Понятное сравнение с прошлой проверкой: «было → стало», «лучше на 2»'
      ] },
      { v: '2.0', date: '23.09.2026', items: [
        'Разбор по предложениям: у каждого подсвеченного предложения — причина',
        'Почерк Claude: «не X, а Y», два тире в предложении, новые шаблоны',
        'Смысловые повторы — нейросеть прямо в браузере',
        'Решение «можно сдавать / на доработку» и шкала словами',
        'Сравнение с прошлой проверкой, пакетная проверка файлов',
        'SEO-показатели: вода, тошнота, читаемость',
        'Отчёт для заказчика одной страницей, с подсказками и разбором',
        'Название и версия в окне «О детекторе»',
        'Новый интерфейс, светлая и тёмная тема'
      ] },
      { v: '1.3', date: '01.09.2026', items: ['Очеловечивание: правки в любой словоформе'] },
      { v: '1.2', date: '01.09.2026', items: ['Экспорт в Word с пометками для копирайтера'] },
      { v: '1.1', date: '31.07.2026', items: ['Проверка кейсов и статей в проекте Claude (check.js)'] },
      { v: '1.0', date: '31.07.2026', items: ['Первый детектор: 9 метрик, база штампов, сегменты'] }
    ]
  };
  V.full = V.name + ' v' + V.version;
  return V;
});

/**
 * AI Detector Knowledge Base (kb.js)
 * Russian-first knowledge base of AI-writing markers for the AI-generated text detector.
 * Plain browser script (window.AIDetectorKB), also loadable in Node via require().
 */
(function (root, factory) {
  var kb = factory();
  if (typeof module === 'object' && module.exports) { module.exports = kb; }
  if (root) { root.AIDetectorKB = kb; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    version: "1.0.0",

    categories: {
      cliche:       { title: "Штамп ИИ",        desc: "Затертые обороты, которыми языковые модели заполняют текст" },
      buzzword:     { title: "Бизнес-жаргон",   desc: "Маркетинговые и корпоративные словечки без конкретики" },
      transition:   { title: "Шаблонная связка", desc: "Механические переходы между предложениями и абзацами" },
      bureaucratic: { title: "Канцелярит",      desc: "Тяжелые официально-деловые конструкции вместо простых слов" },
      filler:       { title: "Вода / филлер",   desc: "Слова и фразы, не добавляющие тексту смысла" },
      hype:         { title: "Гипербола",       desc: "Восторженные преувеличения и пустые превосходные степени" },
      aiphrase:     { title: "Фраза-маркер ИИ", desc: "Обороты, характерные именно для ответов нейросетей" },
      pattern:      { title: "Шаблон ИИ",       desc: "Синтаксические конструкции-почерк нейросетей: «не X, а Y» и подобные" }
    },

    phrases: {
      ru: [
        // ---- cliche ----
        { p: "в современном мире", w: 4, cat: "cliche",
          repl: ["", "сейчас"], note: "Дежурный зачин, с которого нейросеть начинает почти любой текст." },
        { p: "в мире где", w: 4, cat: "cliche",
          repl: [""], note: "Кинотрейлерный зачин, типичный для генерации." },
        { p: "в эпоху цифровых технологий", w: 4, cat: "cliche",
          repl: ["", "сегодня"], note: "Пафосная привязка ко времени — фирменный прием ИИ." },
        { p: "в эпоху глобализации", w: 4, cat: "cliche",
          repl: [""], note: "Штампованный зачин школьного сочинения, любимый LLM." },
        { p: "в эру цифровизации", w: 4, cat: "cliche",
          repl: [""], note: "Псевдосовременный зачин из генеративных SEO-текстов." },
        { p: "в наше время", w: 3, cat: "cliche",
          repl: ["", "сейчас"], note: "Пустая временная рамка, ничего не сообщающая читателю." },
        { p: "в наши дни", w: 3, cat: "cliche",
          repl: ["", "сегодня"], note: "Тот же пустой зачин про современность, что любит ИИ." },
        { p: "в быстро меняющемся мире", w: 4, cat: "cliche",
          repl: [""], note: "Калька с in a fast-paced world из англоязычных промптов." },
        { p: "стоит отметить", w: 4, cat: "cliche",
          repl: [""], note: "Оговорка-паразит, которой ИИ вводит любой факт." },
        { p: "важно отметить", w: 4, cat: "cliche",
          repl: ["", "конкретный факт вместо оговорки"], note: "Классическая оговорка LLM, в живой речи почти не встречается." },
        { p: "следует отметить", w: 4, cat: "cliche",
          repl: [""], note: "Канцелярская оговорка, которой модель тянет объем." },
        { p: "необходимо подчеркнуть", w: 3, cat: "cliche",
          repl: [""], note: "Тяжелая вводная конструкция вместо самого факта." },
        { p: "нельзя не отметить", w: 4, cat: "cliche",
          repl: [""], note: "Двойное отрицание-штамп, характерное для генерации." },
        { p: "стоит подчеркнуть", w: 3, cat: "cliche",
          repl: [""], note: "Еще одна пустая вводная из арсенала ИИ." },
        { p: "важно подчеркнуть", w: 3, cat: "cliche",
          repl: [""], note: "Оговорка, за которой обычно нет ничего важного." },
        { p: "хотелось бы отметить", w: 4, cat: "cliche",
          repl: [""], note: "Вежливая канцелярская вводная, типичная для генерации." },
        { p: "нельзя не упомянуть", w: 3, cat: "cliche",
          repl: [""], note: "Штампованная подводка к очередному пункту списка." },
        { p: "отдельно стоит упомянуть", w: 3, cat: "cliche",
          repl: [""], note: "Механическая подводка, которой ИИ клеит абзацы." },
        { p: "заслуживает особого внимания", w: 3, cat: "cliche",
          repl: [""], note: "Пустая оценка вместо объяснения, чем именно важно." },
        { p: "играет ключевую роль", w: 4, cat: "cliche",
          repl: ["важен", "определяет"], note: "Топ-штамп генеративных текстов о чем угодно." },
        { p: "важную роль", w: 2, cat: "cliche",
          repl: ["важен"], note: "Размытая оценка значимости без конкретики." },
        { p: "является неотъемлемой частью", w: 4, cat: "cliche",
          repl: ["входит в", "часть"], note: "Тяжелый штамп, который ИИ ставит вместо простого глагола." },
        { p: "неотъемлемой частью нашей жизни", w: 5, cat: "cliche",
          repl: [""], note: "Формула-визитка генеративного текста о технологиях." },
        { p: "прочно вошли в нашу жизнь", w: 4, cat: "cliche",
          repl: [""], note: "Шаблонный зачин про то, как что-то стало привычным." },
        { p: "сложно представить нашу жизнь без", w: 4, cat: "cliche",
          repl: [""], note: "Типовое вступление сгенерированной статьи." },
        { p: "невозможно представить без", w: 3, cat: "cliche",
          repl: [""], note: "Гиперболизированный штамп о незаменимости." },
        { p: "мир не стоит на месте", w: 4, cat: "cliche",
          repl: [""], note: "Банальность, которой ИИ открывает тексты о новинках." },
        { p: "технологии не стоят на месте", w: 4, cat: "cliche",
          repl: [""], note: "Сестра-близнец штампа про мир, который не стоит на месте." },
        { p: "шагает в ногу со временем", w: 4, cat: "cliche",
          repl: [""], note: "Газетный штамп, автоматически воспроизводимый моделью." },
        { p: "как никогда актуально", w: 4, cat: "cliche",
          repl: [""], note: "Пустое усиление актуальности без доказательств." },
        { p: "приобретает особую актуальность", w: 4, cat: "cliche",
          repl: [""], note: "Канцелярская формула актуальности из рефератов." },
        { p: "сложно переоценить", w: 4, cat: "cliche",
          repl: ["важен, потому что"], note: "Калька с cannot be overstated — любимый ход LLM." },
        { p: "трудно переоценить", w: 4, cat: "cliche",
          repl: [""], note: "Вариант того же штампа о неизмеримой важности." },
        { p: "в данной статье", w: 4, cat: "cliche",
          repl: ["в статье", "здесь"], note: "Канцелярское самоописание текста, типичное для генерации." },
        { p: "в данном материале", w: 3, cat: "cliche",
          repl: ["здесь"], note: "Тяжелая отсылка текста к самому себе." },
        { p: "ключевые аспекты", w: 3, cat: "cliche",
          repl: ["главное"], note: "Абстрактные аспекты вместо конкретных вещей." },
        { p: "основные преимущества", w: 3, cat: "cliche",
          repl: ["плюсы"], note: "Шаблонный заголовок сгенерированного списка." },
        { p: "ключевые моменты", w: 2, cat: "cliche",
          repl: ["главное"], note: "Размытая обертка для перечисления от ИИ." },
        { p: "важные нюансы", w: 2, cat: "cliche",
          repl: ["детали"], note: "Обещание деталей, за которым часто следует вода." },
        { p: "ключевым фактором", w: 3, cat: "cliche",
          repl: ["главная причина"], note: "Абстрактный фактор вместо конкретной причины." },
        { p: "одним из ключевых", w: 3, cat: "cliche",
          repl: [""], note: "Уклончивая формула «один из», размывающая утверждение." },
        { p: "одним из самых популярных", w: 2, cat: "cliche",
          repl: ["популярный"], note: "Осторожная превосходная степень без данных." },
        { p: "сэкономить время и деньги", w: 3, cat: "cliche",
          repl: [""], note: "Универсальное обещание из рекламных текстов ИИ." },
        { p: "залог успеха", w: 3, cat: "cliche",
          repl: [""], note: "Штампованная формула успеха без содержания." },
        { p: "секрет успеха", w: 3, cat: "cliche",
          repl: [""], note: "Кликбейтный штамп, часто генерируемый моделью." },
        { p: "от новичка до профессионала", w: 4, cat: "cliche",
          repl: [""], note: "Шаблонная формула охвата аудитории в сгенерированных обзорах." },
        { p: "каждый найдет что-то для себя", w: 4, cat: "cliche",
          repl: [""], note: "Пустое обещание для всех сразу — маркер генерации." },
        { p: "не оставит равнодушным", w: 4, cat: "cliche",
          repl: [""], note: "Рекламный штамп, который ИИ ставит вместо оценки." },
        { p: "придется по вкусу", w: 3, cat: "cliche",
          repl: ["понравится"], note: "Устаревший рекламный оборот из генеративных текстов." },
        { p: "на любой вкус", w: 2, cat: "cliche",
          repl: [""], note: "Шаблонное обещание ассортимента." },
        { p: "стоит помнить", w: 3, cat: "cliche",
          repl: [""], note: "Менторская вводная, типичная для ответов ИИ." },
        { p: "важно понимать", w: 3, cat: "cliche",
          repl: [""], note: "Поучающая оговорка перед банальностью." },
        { p: "следует помнить", w: 3, cat: "cliche",
          repl: [""], note: "Дидактическая вставка, которой модель тянет текст." },
        { p: "не стоит забывать", w: 3, cat: "cliche",
          repl: [""], note: "Шаблонное напоминание без нового содержания." },
        { p: "ни для кого не секрет", w: 4, cat: "cliche",
          repl: [""], note: "Вводная-паразит перед общеизвестным фактом." },
        { p: "не секрет что", w: 3, cat: "cliche",
          repl: [""], note: "Оговорка, обесценивающая следующее предложение." },
        { p: "на просторах интернета", w: 4, cat: "cliche",
          repl: ["в интернете"], note: "Псевдопоэтический штамп сгенерированных статей." },
        { p: "вишенка на торте", w: 3, cat: "cliche",
          repl: [""], note: "Затертая метафора-калька, частая в текстах ИИ." },
        { p: "лайфхак", w: 2, cat: "cliche",
          repl: ["совет"], note: "Заезженное словечко контент-маркетинга." },
        { p: "делимся лайфхаками", w: 3, cat: "cliche",
          repl: [""], note: "Шаблонная подводка сгенерированного блога." },
        { p: "краеугольный камень", w: 3, cat: "cliche",
          repl: ["основа"], note: "Книжная метафора, которую ИИ вставляет автоматически." },
        { p: "обратная сторона медали", w: 2, cat: "cliche",
          repl: ["минус"], note: "Затертая метафора для перехода к недостаткам." },
        { p: "подводные камни", w: 2, cat: "cliche",
          repl: ["сложности"], note: "Штампованная метафора рисков в обзорах ИИ." },
        { p: "не является исключением", w: 3, cat: "cliche",
          repl: [""], note: "Формульная связка «и X не является исключением»." },
        { p: "зарекомендовал себя", w: 3, cat: "cliche",
          repl: [""], note: "Канцелярская похвала без фактов из рекламных текстов." },
        { p: "по праву считается", w: 3, cat: "cliche",
          repl: ["считается"], note: "Пустое усиление авторитетности." },
        { p: "сочетает в себе", w: 3, cat: "cliche",
          repl: ["объединяет"], note: "Формула описания продукта в генеративных обзорах." },
        { p: "многие задаются вопросом", w: 4, cat: "cliche",
          repl: [""], note: "Воображаемая аудитория — типичный прием генерации." },
        { p: "вопрос который волнует многих", w: 4, cat: "cliche",
          repl: [""], note: "Шаблонная драматизация темы без данных." },
        { p: "каждый из нас", w: 3, cat: "cliche",
          repl: [""], note: "Обобщение на всех читателей — прием школьного сочинения." },
        { p: "в жизни каждого человека", w: 4, cat: "cliche",
          repl: [""], note: "Патетическое обобщение, любимое нейросетями." },
        { p: "набирает популярность", w: 3, cat: "cliche",
          repl: [""], note: "Дежурная фраза о росте без единой цифры." },
        { p: "набирает обороты", w: 3, cat: "cliche",
          repl: [""], note: "Газетный штамп динамики, частый в генерации." },
        { p: "пользуется большой популярностью", w: 3, cat: "cliche",
          repl: ["популярен"], note: "Многословная канцелярская похвала." },
        { p: "становится все более популярным", w: 3, cat: "cliche",
          repl: [""], note: "Шаблон о росте популярности без источника." },
        { p: "неуклонно растет", w: 3, cat: "cliche",
          repl: ["растет"], note: "Отчетно-газетное наречие, редкое в живой речи." },
        { p: "исследования показывают", w: 3, cat: "cliche",
          repl: ["по данным (источник)"], note: "Ссылка на безымянные исследования — маркер генерации." },
        { p: "ученые доказали", w: 3, cat: "cliche",
          repl: [""], note: "Апелляция к анонимным ученым без ссылки." },
        { p: "эксперты отмечают", w: 3, cat: "cliche",
          repl: [""], note: "Безымянные эксперты — классика сгенерированного текста." },
        { p: "специалисты утверждают", w: 3, cat: "cliche",
          repl: [""], note: "Анонимный авторитет вместо конкретного источника." },
        { p: "статистика показывает", w: 3, cat: "cliche",
          repl: [""], note: "Статистика без цифр и ссылки — признак генерации." },
        { p: "как показывает практика", w: 3, cat: "cliche",
          repl: [""], note: "Апелляция к абстрактной практике без примера." },
        { p: "будущее за", w: 3, cat: "cliche",
          repl: [""], note: "Пророческий штамп финала сгенерированной статьи." },
        { p: "современные технологии позволяют", w: 4, cat: "cliche",
          repl: [""], note: "Универсальный зачин ИИ про возможности технологий." },
        { p: "по последнему слову техники", w: 3, cat: "cliche",
          repl: [""], note: "Устаревший рекламный штамп, воспроизводимый моделью." },
        { p: "современные тенденции", w: 3, cat: "cliche",
          repl: ["тренды"], note: "Абстрактные тенденции без называния конкретных." },
        { p: "ярким примером", w: 3, cat: "cliche",
          repl: ["например"], note: "Шаблонная подводка к примеру в генерации." },
        { p: "несомненным плюсом", w: 3, cat: "cliche",
          repl: ["плюс"], note: "Избыточное усиление оценки, частое у ИИ." },
        { p: "безусловным преимуществом", w: 3, cat: "cliche",
          repl: ["плюс"], note: "Канцелярская похвала из сгенерированных обзоров." },
        { p: "соотношение цены и качества", w: 3, cat: "cliche",
          repl: [""], note: "Дежурная формула любого сгенерированного обзора." },
        { p: "стоит своих денег", w: 2, cat: "cliche",
          repl: [""], note: "Шаблонный вывод обзора без аргументов." },
        { p: "на высшем уровне", w: 2, cat: "cliche",
          repl: ["хорошо"], note: "Пустая превосходная оценка." },
        { p: "идеально подходит", w: 2, cat: "cliche",
          repl: ["подходит"], note: "Избыточное «идеально» — частый рекламный тик ИИ." },
        { p: "отличным выбором", w: 3, cat: "cliche",
          repl: [""], note: "Формула «станет отличным выбором» из генеративных обзоров." },
        { p: "существует множество", w: 3, cat: "cliche",
          repl: ["есть много"], note: "Книжная конструкция, которой ИИ открывает перечисления." },
        { p: "и многое другое", w: 3, cat: "cliche",
          repl: [""], note: "Пустой хвост списка, маскирующий отсутствие фактов." },
        { p: "и не только", w: 2, cat: "cliche",
          repl: [""], note: "Рекламный хвост-обещание без продолжения." },
        { p: "пошаговая инструкция", w: 2, cat: "cliche",
          repl: [""], note: "Шаблонный заголовок генеративного контента." },
        { p: "полезные советы", w: 2, cat: "cliche",
          repl: [""], note: "Дежурная обертка списка банальностей." },
        { p: "эти простые советы", w: 3, cat: "cliche",
          repl: [""], note: "Формула финала сгенерированной статьи-списка." },
        { p: "практические рекомендации", w: 2, cat: "cliche",
          repl: ["советы"], note: "Канцелярская обертка обычных советов." },
        { p: "облегчает жизнь", w: 3, cat: "cliche",
          repl: [""], note: "Универсальное обещание пользы без конкретики." },
        { p: "значительно упрощает", w: 2, cat: "cliche",
          repl: ["упрощает"], note: "Дежурное усиление «значительно» без измерений." },
        { p: "в свете последних событий", w: 3, cat: "cliche",
          repl: [""], note: "Газетный штамп привязки к новостям." },
        { p: "стоит учитывать", w: 2, cat: "cliche",
          repl: [""], note: "Осторожная оговорка, которой ИИ страхует каждый тезис." },

        // ---- aiphrase ----
        { p: "как языковая модель", w: 5, cat: "aiphrase",
          repl: [""], note: "Прямое самоописание нейросети, стопроцентный маркер." },
        { p: "как ии", w: 5, cat: "aiphrase",
          repl: [""], note: "Самоидентификация ассистента, забытая при копировании ответа." },
        { p: "как искусственный интеллект", w: 5, cat: "aiphrase",
          repl: [""], note: "Развернутая самоидентификация модели в тексте." },
        { p: "я не могу", w: 2, cat: "aiphrase",
          repl: [""], note: "Типичное начало отказа ассистента выполнять запрос." },
        { p: "у меня нет личного мнения", w: 5, cat: "aiphrase",
          repl: [""], note: "Стандартный дисклеймер нейросети о собственных взглядах." },
        { p: "у меня нет доступа", w: 4, cat: "aiphrase",
          repl: [""], note: "Служебная оговорка ассистента об ограничениях." },
        { p: "на момент моего последнего обновления", w: 5, cat: "aiphrase",
          repl: [""], note: "Фраза о дате среза знаний — пишет только LLM." },
        { p: "надеюсь эта информация", w: 5, cat: "aiphrase",
          repl: [""], note: "Формула вежливого финала ответа ассистента." },
        { p: "надеюсь это поможет", w: 5, cat: "aiphrase",
          repl: [""], note: "Каноническая концовка ответа чат-бота." },
        { p: "надеюсь вам понравилось", w: 4, cat: "aiphrase",
          repl: [""], note: "Шаблонное прощание сгенерированного текста с читателем." },
        { p: "если у вас остались вопросы", w: 4, cat: "aiphrase",
          repl: [""], note: "Дежурное предложение продолжить диалог от чат-бота." },
        { p: "обращайтесь к специалистам", w: 4, cat: "aiphrase",
          repl: [""], note: "Страховочный дисклеймер, которым ИИ снимает ответственность." },
        { p: "проконсультируйтесь со специалистом", w: 4, cat: "aiphrase",
          repl: [""], note: "Типовой медицинско-юридический дисклеймер модели." },
        { p: "не является медицинской рекомендацией", w: 5, cat: "aiphrase",
          repl: [""], note: "Готовый дисклеймер из ответов ассистента." },
        { p: "конечно вот", w: 5, cat: "aiphrase",
          repl: [""], note: "След от «Конечно! Вот...» — начало ответа чат-бота." },
        { p: "отличный вопрос", w: 4, cat: "aiphrase",
          repl: [""], note: "Комплимент собеседнику — разговорный тик ассистента." },
        { p: "рад помочь", w: 5, cat: "aiphrase",
          repl: [""], note: "Формула вежливости чат-бота, попавшая в текст." },
        { p: "чем еще могу помочь", w: 5, cat: "aiphrase",
          repl: [""], note: "Служебное завершение диалога с ассистентом." },
        { p: "давайте разберемся", w: 4, cat: "aiphrase",
          repl: [""], note: "Панибратская подводка, которой ИИ открывает объяснение." },
        { p: "давайте рассмотрим", w: 4, cat: "aiphrase",
          repl: [""], note: "Лекторская формула вовлечения из ответов модели." },
        { p: "давайте начнем", w: 3, cat: "aiphrase",
          repl: [""], note: "Шаблонный старт сгенерированного руководства." },
        { p: "давайте взглянем", w: 3, cat: "aiphrase",
          repl: [""], note: "Калька с let's take a look из англоязычной генерации." },
        { p: "погрузимся в", w: 4, cat: "aiphrase",
          repl: [""], note: "Калька с let's dive into — визитка ChatGPT." },
        { p: "окунемся в мир", w: 4, cat: "aiphrase",
          repl: [""], note: "Псевдоувлекательный зачин генеративной статьи." },
        { p: "рассмотрим подробнее", w: 3, cat: "aiphrase",
          repl: [""], note: "Механический переход к детализации в тексте ИИ." },
        { p: "разберем по порядку", w: 3, cat: "aiphrase",
          repl: [""], note: "Шаблонная организация ответа, типичная для модели." },
        { p: "углубимся в", w: 3, cat: "aiphrase",
          repl: [""], note: "Русский аналог delve into — характерный глагол ИИ." },
        { p: "копнем глубже", w: 3, cat: "aiphrase",
          repl: [""], note: "Калька с dig deeper из генеративных статей." },
        { p: "в этой статье мы рассмотрим", w: 5, cat: "aiphrase",
          repl: [""], note: "Каноническое вступление статьи, написанной нейросетью." },
        { p: "в этом руководстве", w: 3, cat: "aiphrase",
          repl: [""], note: "Самоописание текста в стиле сгенерированных гайдов." },
        { p: "шаг за шагом", w: 2, cat: "aiphrase",
          repl: [""], note: "Калька со step by step, частая в инструкциях ИИ." },
        { p: "вот несколько советов", w: 3, cat: "aiphrase",
          repl: [""], note: "Типовая подводка к списку от ассистента." },
        { p: "следуя этим советам", w: 4, cat: "aiphrase",
          repl: [""], note: "Шаблонная концовка сгенерированной статьи-списка." },
        { p: "обратите внимание", w: 2, cat: "aiphrase",
          repl: [""], note: "Менторское обращение к читателю, частое у ИИ." },
        { p: "помните что", w: 3, cat: "aiphrase",
          repl: [""], note: "Поучающее напоминание — разговорный тик ассистента." },
        { p: "не забывайте", w: 2, cat: "aiphrase",
          repl: [""], note: "Дидактическое обращение из сгенерированных советов." },
        { p: "свяжитесь с нами", w: 2, cat: "aiphrase",
          repl: [""], note: "Шаблонный призыв к действию из генеративного лендинга." },
        { p: "оставайтесь с нами", w: 3, cat: "aiphrase",
          repl: [""], note: "Дежурное прощание сгенерированного блога." },
        { p: "удачи в ваших начинаниях", w: 4, cat: "aiphrase",
          repl: [""], note: "Пафосное напутствие — типичный финал ответа ИИ." },
        { p: "приятного чтения", w: 2, cat: "aiphrase",
          repl: [""], note: "Формальное пожелание из шаблона генерации." },
        { p: "для достижения наилучших результатов", w: 4, cat: "aiphrase",
          repl: [""], note: "Калька с for best results из инструкций модели." },
        { p: "в зависимости от ваших потребностей", w: 4, cat: "aiphrase",
          repl: [""], note: "Уклончивая формула ассистента вместо конкретного совета." },

        // ---- transition ----
        { p: "не только но и", w: 3, cat: "transition",
          repl: [""], note: "Любимая парная конструкция нейросетей в каждом абзаце." },
        { p: "подводя итог", w: 3, cat: "transition",
          repl: [""], note: "Формульное начало заключения сгенерированного текста." },
        { p: "подытожим", w: 3, cat: "transition",
          repl: [""], note: "Механический сигнал финала, типичный для ИИ." },
        { p: "резюмируя", w: 3, cat: "transition",
          repl: [""], note: "Книжное деепричастие для шаблонного вывода." },
        { p: "в заключение", w: 3, cat: "transition",
          repl: [""], note: "Обязательная рубрика финала в структуре ответа ИИ." },
        { p: "в заключение стоит отметить", w: 5, cat: "transition",
          repl: [""], note: "Двойной штамп финала — почти гарантированная генерация." },
        { p: "таким образом", w: 2, cat: "transition",
          repl: [""], note: "Дежурная логическая связка, которой ИИ склеивает выводы." },
        { p: "будь то", w: 2, cat: "transition",
          repl: [""], note: "Калька с whether it is, частая в перечислениях модели." },
        { p: "в первую очередь", w: 2, cat: "transition",
          repl: ["сначала"], note: "Шаблонный ранжирующий переход." },
        { p: "прежде всего", w: 2, cat: "transition",
          repl: [""], note: "Книжная вводная, которой модель открывает списки." },
        { p: "кроме того", w: 2, cat: "transition",
          repl: [""], note: "Механическая добавка «еще один пункт» в текстах ИИ." },
        { p: "более того", w: 2, cat: "transition",
          repl: [""], note: "Формальное усиление между предложениями." },
        { p: "помимо этого", w: 2, cat: "transition",
          repl: [""], note: "Однотипный переход-перечисление из генерации." },
        { p: "тем не менее", w: 2, cat: "transition",
          repl: ["но"], note: "Книжная уступительная связка вместо простого «но»." },
        { p: "в свою очередь", w: 2, cat: "transition",
          repl: [""], note: "Канцелярская связка, редкая в живой речи." },
        { p: "с одной стороны", w: 2, cat: "transition",
          repl: [""], note: "Первая половина шаблонной парной конструкции." },
        { p: "с другой стороны", w: 2, cat: "transition",
          repl: [""], note: "Механическое взвешивание «за и против» в стиле ИИ." },
        { p: "следовательно", w: 2, cat: "transition",
          repl: ["значит"], note: "Учебниковая связка вывода, любимая моделью." },
        { p: "в конечном итоге", w: 2, cat: "transition",
          repl: ["в итоге"], note: "Избыточная формула завершения мысли." },
        { p: "как уже упоминалось", w: 3, cat: "transition",
          repl: [""], note: "Самоотсылка текста — прием структурированной генерации." },
        { p: "как было сказано выше", w: 3, cat: "transition",
          repl: [""], note: "Канцелярская самоотсылка, частая в текстах ИИ." },
        { p: "можно сделать вывод", w: 3, cat: "transition",
          repl: [""], note: "Формула вывода из школьного сочинения и генерации." },
        { p: "напрашивается вывод", w: 2, cat: "transition",
          repl: [""], note: "Книжная подводка к заключению." },
        { p: "из этого следует", w: 2, cat: "transition",
          repl: [""], note: "Учебниковая логическая связка." },
        { p: "перейдем к", w: 2, cat: "transition",
          repl: [""], note: "Механический переход между разделами ответа ИИ." },
        { p: "что касается", w: 2, cat: "transition",
          repl: [""], note: "Канцелярский переход к новой теме." },
        { p: "если говорить о", w: 2, cat: "transition",
          repl: [""], note: "Уклончивая подводка, растягивающая предложение." },
        { p: "иными словами", w: 1, cat: "transition",
          repl: [""], note: "Частый у ИИ пересказ только что сказанного." },
        { p: "проще говоря", w: 1, cat: "transition",
          repl: [""], note: "Сигнал упрощения, которым модель дублирует мысль." },
        { p: "простыми словами", w: 2, cat: "transition",
          repl: [""], note: "SEO-формула «объясняем простыми словами»." },
        { p: "к примеру", w: 1, cat: "transition",
          repl: ["например"], note: "Книжный вариант «например», частый в генерации." },
        { p: "в частности", w: 1, cat: "transition",
          repl: [""], note: "Формальная детализация в стиле отчета." },
        { p: "а именно", w: 1, cat: "transition",
          repl: [""], note: "Канцелярская уточняющая связка." },

        // ---- bureaucratic ----
        { p: "данный", w: 3, cat: "bureaucratic",
          repl: ["этот"], note: "Канцелярское «данный» вместо простого «этот»." },
        { p: "данная статья", w: 4, cat: "bureaucratic",
          repl: ["эта статья"], note: "Официозное самоописание текста, типичное для генерации." },
        { p: "осуществлять деятельность", w: 4, cat: "bureaucratic",
          repl: ["работать"], note: "Классический канцелярит вместо простого глагола." },
        { p: "производить оплату", w: 3, cat: "bureaucratic",
          repl: ["платить"], note: "Отглагольная конструкция вместо «платить»." },
        { p: "в рамках", w: 2, cat: "bureaucratic",
          repl: ["в", "внутри"], note: "Канцелярский предлог-паразит." },
        { p: "с целью", w: 2, cat: "bureaucratic",
          repl: ["чтобы"], note: "Официозная замена простого «чтобы»." },
        { p: "в целях", w: 2, cat: "bureaucratic",
          repl: ["чтобы", "для"], note: "Канцелярская конструкция из документов." },
        { p: "по причине", w: 2, cat: "bureaucratic",
          repl: ["из-за"], note: "Тяжелый предлог вместо «из-за»." },
        { p: "в связи с этим", w: 3, cat: "bureaucratic",
          repl: ["поэтому"], note: "Официозная связка вместо «поэтому»." },
        { p: "в настоящее время", w: 3, cat: "bureaucratic",
          repl: ["сейчас"], note: "Канцелярское «сейчас», любимое нейросетями." },
        { p: "на сегодняшний день", w: 3, cat: "bureaucratic",
          repl: ["сегодня", "сейчас"], note: "Раздутая замена слова «сегодня»." },
        { p: "имеет место быть", w: 3, cat: "bureaucratic",
          repl: ["есть"], note: "Избыточный оборот-ошибка из плохого канцелярита." },
        { p: "оказывает влияние", w: 3, cat: "bureaucratic",
          repl: ["влияет"], note: "Расщепленное сказуемое вместо «влияет»." },
        { p: "принимает участие", w: 3, cat: "bureaucratic",
          repl: ["участвует"], note: "Расщепленное сказуемое вместо «участвует»." },
        { p: "находит применение", w: 3, cat: "bureaucratic",
          repl: ["применяется"], note: "Канцелярская формула из рефератов." },
        { p: "получил широкое распространение", w: 3, cat: "bureaucratic",
          repl: ["распространился"], note: "Отчетная формула, типичная для генерации." },
        { p: "вне зависимости от", w: 2, cat: "bureaucratic",
          repl: ["независимо от"], note: "Утяжеленный вариант «независимо от»." },
        { p: "в условиях", w: 2, cat: "bureaucratic",
          repl: ["при"], note: "Отчетный предлог из официальных текстов." },
        { p: "в контексте", w: 2, cat: "bureaucratic",
          repl: [""], note: "Модный канцеляризм, размывающий смысл." },
        { p: "принимая во внимание", w: 2, cat: "bureaucratic",
          repl: ["учитывая"], note: "Тяжелый деепричастный оборот из документов." },
        { p: "учитывая вышесказанное", w: 3, cat: "bureaucratic",
          repl: [""], note: "Протокольная связка финала, частая у ИИ." },
        { p: "исходя из вышеизложенного", w: 4, cat: "bureaucratic",
          repl: ["поэтому"], note: "Формула из служебных записок, а не живого текста." },
        { p: "все вышеперечисленное", w: 3, cat: "bureaucratic",
          repl: ["все это"], note: "Канцелярская отсылка к списку выше." },
        { p: "заключается в том что", w: 2, cat: "bureaucratic",
          repl: [""], note: "Многословная конструкция вместо прямого утверждения." },
        { p: "обусловлено тем что", w: 3, cat: "bureaucratic",
          repl: ["потому что"], note: "Наукообразная причинная связка." },
        { p: "влечет за собой", w: 2, cat: "bureaucratic",
          repl: ["ведет к"], note: "Юридический оборот в обычном тексте." },
        { p: "положительно влияет", w: 2, cat: "bureaucratic",
          repl: ["помогает"], note: "Отчетная формула пользы без конкретики." },
        { p: "негативно сказывается", w: 2, cat: "bureaucratic",
          repl: ["вредит"], note: "Официозная формула вреда." },
        { p: "целесообразно", w: 2, cat: "bureaucratic",
          repl: ["стоит"], note: "Слово из служебной переписки, редкое в живой речи." },
        { p: "надлежащим образом", w: 2, cat: "bureaucratic",
          repl: ["как следует"], note: "Юридический штамп в бытовом контексте." },
        { p: "должным образом", w: 2, cat: "bureaucratic",
          repl: ["как надо"], note: "Канцелярское наречие из документов." },
        { p: "в полной мере", w: 2, cat: "bureaucratic",
          repl: ["полностью"], note: "Раздутое «полностью» из отчетов." },
        { p: "в значительной степени", w: 2, cat: "bureaucratic",
          repl: ["во многом"], note: "Наукообразная мера без измерения." },
        { p: "в той или иной степени", w: 2, cat: "bureaucratic",
          repl: [""], note: "Уклончивая формула, размывающая утверждение." },
        { p: "в кратчайшие сроки", w: 3, cat: "bureaucratic",
          repl: ["быстро"], note: "Штамп деловой переписки в рекламном тексте." },
        { p: "в сжатые сроки", w: 2, cat: "bureaucratic",
          repl: ["быстро"], note: "Отчетная формула скорости." },
        { p: "согласно данным", w: 2, cat: "bureaucratic",
          repl: ["по данным"], note: "Официозная отсылка к данным, часто без источника." },
        { p: "на основании", w: 2, cat: "bureaucratic",
          repl: ["по"], note: "Юридический предлог вне юридического текста." },
        { p: "в качестве примера", w: 2, cat: "bureaucratic",
          repl: ["например"], note: "Многословная подводка к примеру." },
        { p: "примером может служить", w: 2, cat: "bureaucratic",
          repl: ["например"], note: "Учебниковая конструкция из рефератов." },
        { p: "ниже приведены", w: 3, cat: "bureaucratic",
          repl: [""], note: "Техническое самоописание структуры — стиль ответа ИИ." },
        { p: "можно выделить следующие", w: 3, cat: "bureaucratic",
          repl: [""], note: "Формула перед маркированным списком в генерации." },
        { p: "достижение поставленных целей", w: 3, cat: "bureaucratic",
          repl: [""], note: "Отчетный штамп о целях без содержания." },
        { p: "актуальность данной темы", w: 4, cat: "bureaucratic",
          repl: [""], note: "Формула из введения курсовой, воспроизводимая ИИ." },
        { p: "высококвалифицированный", w: 3, cat: "bureaucratic",
          repl: ["опытный"], note: "Кадровый канцеляризм из рекламных текстов." },

        // ---- buzzword ----
        { p: "широкий спектр", w: 3, cat: "buzzword",
          repl: ["много", "разные"], note: "Маркетинговая формула ассортимента без конкретики." },
        { p: "индивидуальный подход", w: 3, cat: "buzzword",
          repl: [""], note: "Пустое обещание из каждого сгенерированного лендинга." },
        { p: "комплексный подход", w: 3, cat: "buzzword",
          repl: [""], note: "Абстрактная «комплексность» вместо описания работы." },
        { p: "инновационные решения", w: 4, cat: "buzzword",
          repl: ["новые разработки"], note: "Дежурная пара слов корпоративного маркетинга." },
        { p: "передовые технологии", w: 3, cat: "buzzword",
          repl: [""], note: "Рекламный штамп без называния технологий." },
        { p: "динамично развивающийся", w: 4, cat: "buzzword",
          repl: ["растущий"], note: "Визитка шаблонного корпоративного текста." },
        { p: "стремительно развивающийся", w: 3, cat: "buzzword",
          repl: ["быстро растущий"], note: "Штамп о росте без цифр." },
        { p: "эффективный инструмент", w: 3, cat: "buzzword",
          repl: [""], note: "Универсальная похвала без критериев эффективности." },
        { p: "богатый функционал", w: 3, cat: "buzzword",
          repl: ["много функций"], note: "Дежурная фраза сгенерированных обзоров софта." },
        { p: "интуитивно понятный интерфейс", w: 4, cat: "buzzword",
          repl: ["простой интерфейс"], note: "Обязательный штамп любого обзора приложения от ИИ." },
        { p: "решение под ключ", w: 3, cat: "buzzword",
          repl: [""], note: "Продажный штамп корпоративных лендингов." },
        { p: "цифровая трансформация", w: 3, cat: "buzzword",
          repl: [""], note: "Модный корпоративный термин-пустышка." },
        { p: "оптимизация бизнес-процессов", w: 3, cat: "buzzword",
          repl: ["наладить работу"], note: "Консалтинговый жаргон из генеративных текстов." },
        { p: "повысить эффективность", w: 2, cat: "buzzword",
          repl: ["работать лучше"], note: "Абстрактное обещание без метрик." },
        { p: "синергия", w: 3, cat: "buzzword",
          repl: ["совместный эффект"], note: "Корпоративное словечко, любимое генерацией." },
        { p: "экосистема", w: 2, cat: "buzzword",
          repl: [""], note: "Модная метафора для любого набора продуктов." },
        { p: "масштабирование", w: 2, cat: "buzzword",
          repl: ["рост"], note: "Стартаперский жаргон в неуместном контексте." },
        { p: "бесшовная интеграция", w: 4, cat: "buzzword",
          repl: ["простое подключение"], note: "Прямая калька с seamless integration." },
        { p: "клиентоориентированный", w: 3, cat: "buzzword",
          repl: [""], note: "Корпоративный эпитет-пустышка." },
        { p: "конкурентные преимущества", w: 3, cat: "buzzword",
          repl: ["сильные стороны"], note: "Бизнес-штамп вместо конкретных отличий." },
        { p: "ключевые показатели эффективности", w: 3, cat: "buzzword",
          repl: ["KPI", "метрики"], note: "Развернутый канцелярский перевод KPI." },
        { p: "дорожная карта", w: 2, cat: "buzzword",
          repl: ["план"], note: "Калька с roadmap вместо слова «план»." },
        { p: "точки роста", w: 3, cat: "buzzword",
          repl: [""], note: "Консалтинговый жаргон из сгенерированных стратегий." },
        { p: "болевые точки", w: 3, cat: "buzzword",
          repl: ["проблемы"], note: "Калька с pain points из маркетинговой генерации." },
        { p: "клиентский опыт", w: 2, cat: "buzzword",
          repl: [""], note: "Калька с customer experience." },
        { p: "пользовательский опыт", w: 2, cat: "buzzword",
          repl: ["удобство"], note: "Калька с user experience в неуместном контексте." },
        { p: "вовлеченность", w: 2, cat: "buzzword",
          repl: [""], note: "Маркетинговая метрика как модное слово." },
        { p: "лидогенерация", w: 2, cat: "buzzword",
          repl: ["привлечение клиентов"], note: "Маркетинговый жаргон из генеративных текстов." },
        { p: "целевая аудитория", w: 2, cat: "buzzword",
          repl: ["читатели", "клиенты"], note: "Дежурный маркетинговый термин." },
        { p: "качественный контент", w: 3, cat: "buzzword",
          repl: [""], note: "Самоописание контент-маркетинга без критериев качества." },
        { p: "уникальный контент", w: 3, cat: "buzzword",
          repl: [""], note: "SEO-штамп, частый в сгенерированных текстах о текстах." },
        { p: "амбициозные цели", w: 2, cat: "buzzword",
          repl: [""], note: "Корпоративная формула без конкретных целей." },
        { p: "проактивный", w: 2, cat: "buzzword",
          repl: ["инициативный"], note: "HR-жаргон, калька с proactive." },
        { p: "коллаборация", w: 2, cat: "buzzword",
          repl: ["сотрудничество"], note: "Модная калька вместо «сотрудничество»." },
        { p: "команда профессионалов", w: 3, cat: "buzzword",
          repl: [""], note: "Пустой штамп любого сгенерированного лендинга." },
        { p: "многолетний опыт", w: 3, cat: "buzzword",
          repl: [""], note: "Дежурная похвала без числа лет и примеров." },
        { p: "квалифицированные специалисты", w: 3, cat: "buzzword",
          repl: [""], note: "Канцелярская формула из рекламных текстов." },
        { p: "гибкая система скидок", w: 3, cat: "buzzword",
          repl: [""], note: "Штамп прайс-листа из генеративного маркетинга." },
        { p: "широкий ассортимент", w: 3, cat: "buzzword",
          repl: ["большой выбор"], note: "Витринный штамп сгенерированных описаний магазинов." },
        { p: "оптимальное решение", w: 3, cat: "buzzword",
          repl: ["лучший вариант"], note: "Наукообразная похвала без сравнения альтернатив." },
        { p: "высокий уровень сервиса", w: 3, cat: "buzzword",
          repl: [""], note: "Пустое обещание качества обслуживания." },
        { p: "лидирующие позиции", w: 3, cat: "buzzword",
          repl: [""], note: "Отчетный штамп о лидерстве без рейтинга." },
        { p: "эксклюзивный", w: 2, cat: "buzzword",
          repl: ["особый"], note: "Рекламный эпитет-усилитель." },
        { p: "премиальный", w: 2, cat: "buzzword",
          repl: ["дорогой"], note: "Маркетинговый эпитет сегмента «люкс»." },
        { p: "высокотехнологичный", w: 2, cat: "buzzword",
          repl: [""], note: "Пустой технический эпитет без деталей." },
        { p: "ультрасовременный", w: 3, cat: "buzzword",
          repl: ["новый"], note: "Рекламное усиление современности." },

        // ---- hype ----
        { p: "открывает новые горизонты", w: 4, cat: "hype",
          repl: [""], note: "Пафосная метафора возможностей — визитка генерации." },
        { p: "выходит на новый уровень", w: 4, cat: "hype",
          repl: [""], note: "Штамп о прогрессе без указания, что изменилось." },
        { p: "поднять на новый уровень", w: 4, cat: "hype",
          repl: ["улучшить"], note: "Калька с take it to the next level." },
        { p: "уникальная возможность", w: 3, cat: "hype",
          repl: ["возможность"], note: "Рекламное усиление, обесценившее слово «уникальный»." },
        { p: "настоящая находка", w: 3, cat: "hype",
          repl: [""], note: "Восторженный штамп сгенерированных обзоров." },
        { p: "истинное удовольствие", w: 3, cat: "hype",
          repl: [""], note: "Книжно-рекламное преувеличение." },
        { p: "незаменимый помощник", w: 4, cat: "hype",
          repl: [""], note: "Формула похвалы гаджета в генеративных обзорах." },
        { p: "квинтэссенция", w: 3, cat: "hype",
          repl: ["суть"], note: "Книжное слово, которым ИИ украшает текст." },
        { p: "многогранный", w: 3, cat: "hype",
          repl: ["разносторонний"], note: "Дежурный эпитет генерации о чем угодно." },
        { p: "всеобъемлющий", w: 3, cat: "hype",
          repl: ["полный"], note: "Калька с comprehensive — частый эпитет ИИ." },
        { p: "беспрецедентный", w: 3, cat: "hype",
          repl: ["небывалый"], note: "Калька с unprecedented — любимое усиление модели." },
        { p: "революционный", w: 3, cat: "hype",
          repl: ["новый"], note: "Рекламная гипербола о любом продукте." },
        { p: "прорывной", w: 3, cat: "hype",
          repl: ["заметный"], note: "Штамп о прорыве без доказательств." },
        { p: "феноменальный", w: 3, cat: "hype",
          repl: ["отличный"], note: "Избыточная превосходная степень." },
        { p: "кладезь", w: 3, cat: "hype",
          repl: ["источник"], note: "Архаичная метафора «кладезь знаний» из генерации." },
        { p: "палитра возможностей", w: 4, cat: "hype",
          repl: ["возможности"], note: "Псевдохудожественная метафора сгенерированных текстов." },
        { p: "спектр возможностей", w: 3, cat: "hype",
          repl: ["возможности"], note: "Наукообразная метафора-обертка." },
        { p: "арсенал инструментов", w: 3, cat: "hype",
          repl: ["набор инструментов"], note: "Военная метафора из генеративных обзоров." },
        { p: "безграничные возможности", w: 4, cat: "hype",
          repl: [""], note: "Гипербола, за которой нет ни одной конкретной функции." },
        { p: "огромный потенциал", w: 3, cat: "hype",
          repl: [""], note: "Дежурная фраза о будущем без прогноза." },
        { p: "раскрыть потенциал", w: 3, cat: "hype",
          repl: [""], note: "Калька с unlock the potential." },
        { p: "впечатляющие результаты", w: 3, cat: "hype",
          repl: [""], note: "Оценка без цифр — типичная генеративная похвала." },
        { p: "настоящий прорыв", w: 3, cat: "hype",
          repl: [""], note: "Громкое заявление без обоснования." },
        { p: "меняет правила игры", w: 4, cat: "hype",
          repl: [""], note: "Прямая калька с game-changer." },
        { p: "поражает воображение", w: 4, cat: "hype",
          repl: [""], note: "Восторженный штамп сгенерированных описаний." },
        { p: "захватывает дух", w: 3, cat: "hype",
          repl: [""], note: "Туристическо-рекламная гипербола." },
        { p: "захватывающее путешествие", w: 4, cat: "hype",
          repl: [""], note: "Метафора «путешествия» в текст — фирменный ход ИИ." },
        { p: "удивительный мир", w: 3, cat: "hype",
          repl: [""], note: "Зачин детской энциклопедии, частый в генерации." },
        { p: "идеальное решение", w: 3, cat: "hype",
          repl: ["подходящий вариант"], note: "Абсолютная оценка без сравнения." },
        { p: "гармоничное сочетание", w: 3, cat: "hype",
          repl: [""], note: "Обтекаемая похвала из сгенерированных описаний." },
        { p: "непревзойденный", w: 3, cat: "hype",
          repl: ["лучший"], note: "Превосходная степень без сравнения." },
        { p: "безупречный", w: 2, cat: "hype",
          repl: ["хороший"], note: "Абсолютная похвала, редкая в честных отзывах." },
        { p: "ошеломляющий", w: 3, cat: "hype",
          repl: [""], note: "Гипербола из переводного маркетинга." },
        { p: "легендарный", w: 2, cat: "hype",
          repl: ["известный"], note: "Обесцененное усиление из генеративных обзоров." },
        { p: "поистине", w: 2, cat: "hype",
          repl: [""], note: "Архаичное усиление, которым ИИ подчеркивает пафос." },
        { p: "на пике популярности", w: 3, cat: "hype",
          repl: ["популярен"], note: "Штамп о тренде без данных." },
        { p: "завоевал сердца", w: 3, cat: "hype",
          repl: ["понравился"], note: "Романтическая гипербола сгенерированных обзоров." },
        { p: "и это еще не все", w: 3, cat: "hype",
          repl: [""], note: "Прием телемагазина, воспроизводимый моделью." },
        { p: "огромное разнообразие", w: 3, cat: "hype",
          repl: ["много"], note: "Гипербола ассортимента без примеров." },

        // ---- filler ----
        { p: "как известно", w: 2, cat: "filler",
          repl: [""], note: "Апелляция к общеизвестности вместо источника." },
        { p: "все мы знаем", w: 3, cat: "filler",
          repl: [""], note: "Навязанное согласие читателя — прием генерации." },
        { p: "согласитесь", w: 2, cat: "filler",
          repl: [""], note: "Риторическое давление на читателя из SEO-текстов." },
        { p: "очевидно что", w: 2, cat: "filler",
          repl: [""], note: "Слово «очевидно» перед недоказанным утверждением." },
        { p: "само собой разумеется", w: 2, cat: "filler",
          repl: [""], note: "Пустая вводная, не добавляющая смысла." },
        { p: "как правило", w: 1, cat: "filler",
          repl: ["обычно"], note: "Частая у ИИ страховочная оговорка." },
        { p: "в большинстве случаев", w: 1, cat: "filler",
          repl: ["чаще всего"], note: "Уклончивая квантификация без данных." },
        { p: "зачастую", w: 2, cat: "filler",
          repl: ["часто"], note: "Книжное наречие, которым модель заменяет «часто»." },
        { p: "нередко", w: 2, cat: "filler",
          repl: ["часто"], note: "Литота из книжной речи, частая в генерации." },
        { p: "в общем и целом", w: 2, cat: "filler",
          repl: [""], note: "Дублирующая вводная без содержания." },
        { p: "так или иначе", w: 1, cat: "filler",
          repl: [""], note: "Связка-паразит, сглаживающая любой переход." },
        { p: "принято считать", w: 2, cat: "filler",
          repl: [""], note: "Безличная отсылка к мнению без носителя." },
        { p: "бытует мнение", w: 2, cat: "filler",
          repl: [""], note: "Анонимное мнение — уклончивый прием генерации." },
        { p: "многие люди", w: 2, cat: "filler",
          repl: ["многие"], note: "Размытая аудитория «многие люди считают»." },
        { p: "большинство людей", w: 2, cat: "filler",
          repl: [""], note: "Социология без опроса — типичная генерация." },
        { p: "каждый человек", w: 2, cat: "filler",
          repl: [""], note: "Тотальное обобщение в стиле сочинения." },
        { p: "без сомнения", w: 2, cat: "filler",
          repl: [""], note: "Уверенность-пустышка перед спорным тезисом." },
        { p: "вне всякого сомнения", w: 3, cat: "filler",
          repl: [""], note: "Усиленная версия пустой уверенности." },
        { p: "бесспорно", w: 2, cat: "filler",
          repl: [""], note: "Слово-щит от возражений без аргументов." },
        { p: "трудно не согласиться", w: 3, cat: "filler",
          repl: [""], note: "Риторическое поддакивание самому себе." },
        { p: "что немаловажно", w: 2, cat: "filler",
          repl: [""], note: "Вставка-подчеркивание без нового смысла." },
        { p: "что примечательно", w: 2, cat: "filler",
          repl: [""], note: "Пустая пометка «это интересно» от модели." },
        { p: "на первый взгляд", w: 1, cat: "filler",
          repl: [""], note: "Шаблонная драматургия «кажется, но на самом деле»." },
        { p: "по сути", w: 1, cat: "filler",
          repl: [""], note: "Слово-прокладка перед пересказом той же мысли." },
        { p: "с точки зрения", w: 1, cat: "filler",
          repl: [""], note: "Наукообразная рамка, часто лишняя." },
        { p: "в зависимости от ситуации", w: 2, cat: "filler",
          repl: [""], note: "Уклончивый ответ ассистента вместо конкретики." },
        { p: "все зависит от", w: 2, cat: "filler",
          repl: [""], note: "Классический уход модели от прямого ответа." },
        { p: "начнем с того что", w: 2, cat: "filler",
          repl: [""], note: "Раскачка перед началом мысли." },
        { p: "ответ на этот вопрос", w: 2, cat: "filler",
          repl: [""], note: "Самоотсылка «ответ на этот вопрос неоднозначен»." },
        { p: "стоит признать", w: 2, cat: "filler",
          repl: [""], note: "Псевдооткровенность, не несущая информации." },

        // ---- синтаксические шаблоны (re вместо p) ----
        // Проверено в сентябре 2026: у Claude «не X, а Y» в 9% предложений,
        // у живых авторов (корпус LLMTrace) и в вычищенных кейсах — около 1%.
        { p: "не X, а Y", re: "(?<![\\p{L}\\p{N}_])не\\s+[^.!?,;:—–\\n]{1,40},\\s*а(?![\\p{L}\\p{N}_])", w: 2, cat: "pattern",
          repl: [], note: "Противопоставление «не X, а Y» — главный почерк Claude. Одно на текст допустимо; скажите прямо, что это такое." },
        { p: "не просто X, а Y", re: "(?<![\\p{L}\\p{N}_])не\\s+просто(?![\\p{L}\\p{N}_])[^.!?\\n]{1,40}?,\\s*(а|но)(?![\\p{L}\\p{N}_])", w: 3, cat: "pattern",
          repl: [], note: "«Не просто X, а Y» — усилитель, которым нейросеть придаёт вес обычной мысли." },
        { p: "это не X, это Y", re: "(?<![\\p{L}\\p{N}_])это\\s+не\\s+[^.!?\\n]{1,40}[,—:–-]\\s*это(?![\\p{L}\\p{N}_])", w: 3, cat: "pattern",
          repl: [], note: "«Это не X, это Y» — риторическая переформулировка из генеративных текстов." },
        { p: "без X. без Y. только Z", re: "(?<=(?:^|[.!?…\\n])\\s*)(?:без|ни)\\s+[^.!?\\n]{1,40}[.!?]\\s+(?:без|ни)\\s+[^.!?\\n]{1,40}[.!?]\\s+(?:только|просто|лишь)(?![\\p{L}\\p{N}_])", w: 3, cat: "pattern",
          repl: [], note: "Рубленая триада «Без X. Без Y. Только Z.» — рекламный приём нейросетей." },
        { p: "неодушевлённое подлежащее", re: "(?<![\\p{L}\\p{N}_])(решени[а-яё]+|платформ[а-яё]+|систем[а-яё]+|подход[а-яё]*|технологи[а-яё]+|инициатив[а-яё]+|проект[а-яё]*)\\s+(подчёркива[а-яё]+|подчеркива[а-яё]+|демонстрир[а-яё]+|символизир[а-яё]+|иллюстрир[а-яё]+)(?![\\p{L}\\p{N}_])", w: 2, cat: "pattern",
          repl: [], note: "«Платформа демонстрирует», «решение подчёркивает» — вещь не может подчёркивать; скажите, кто и что сделал." },

        // ---- из каталога humanizer-ru (MIT, github.com/ilyautov/humanizer-ru) ----
        // Взяты только те, что не встречаются в живом деловом тексте: «на основе»,
        // «с учётом», «на фоне» оставлены — в кейсах это нормальная речь.
        { p: "необходимо отметить", w: 3, cat: "cliche", repl: [""], note: "Канцелярская оговорка перед фактом." },
        { p: "следует учитывать", w: 2, cat: "cliche", repl: ["учтите"], note: "Назидательная вводная из генерации." },
        { p: "можно сказать", w: 2, cat: "filler", repl: [""], note: "Страховочная оговорка: либо говорите, либо нет." },
        { p: "суммируя вышесказанное", w: 4, cat: "transition", repl: [""], note: "Формульный вывод в конце текста." },
        { p: "невозможно переоценить", w: 4, cat: "hype", repl: [""], note: "Пустое преувеличение значимости." },
        { p: "важнейший", w: 2, cat: "hype", repl: ["главный", ""], note: "Раздувание значимости." },
        { p: "колоссальный", w: 2, cat: "hype", repl: ["большой"], note: "Раздувание масштаба без цифры." },
        { p: "переломный момент", w: 3, cat: "hype", repl: [""], note: "Драматизация из генеративных текстов." },
        { p: "фундаментальный", w: 1, cat: "hype", repl: ["основной"], note: "Раздувание значимости." },
        { p: "важный шаг", w: 2, cat: "hype", repl: ["шаг"], note: "Пустая оценка вместо факта." },
        { p: "ключевой момент", w: 2, cat: "buzzword", repl: ["главное"], note: "Маркетинговый штамп." },
        { p: "ключевая роль", w: 3, cat: "buzzword", repl: [""], note: "Штамп «ключевая роль» — покажите, что именно делает." },
        { p: "инновационное решение", w: 3, cat: "buzzword", repl: [""], note: "Рекламный штамп без содержания." },
        { p: "доверительные отношения", w: 2, cat: "buzzword", repl: ["доверие"], note: "Маркетинговый штамп." },
        { p: "связь с аудиторией", w: 2, cat: "buzzword", repl: [""], note: "Маркетинговый штамп." },
        { p: "не секрет что", w: 3, cat: "cliche", repl: [""], note: "Дежурный зачин перед общеизвестным." },
        { p: "всё чаще", w: 1, cat: "cliche", repl: [""], note: "Зачин-тренд без цифры." },
        { p: "все чаще", w: 1, cat: "cliche", repl: [""], note: "Зачин-тренд без цифры." },
        { p: "по мнению экспертов", w: 2, cat: "aiphrase", repl: [""], note: "Ссылка на безымянных экспертов." },
        { p: "специалисты отмечают", w: 2, cat: "aiphrase", repl: [""], note: "Ссылка на безымянных специалистов." },
        { p: "способен обеспечить", w: 2, cat: "filler", repl: ["обеспечивает"], note: "Модальная страховка вместо утверждения." },
        { p: "призван решить", w: 2, cat: "filler", repl: ["решает"], note: "Модальная страховка вместо утверждения." },
        { p: "может быть полезен", w: 1, cat: "filler", repl: ["помогает"], note: "Модальная страховка вместо утверждения." },
        { p: "вывести на новый уровень", w: 4, cat: "cliche", repl: [""], note: "Мотивационный штамп." },
        { p: "открывает новые возможности", w: 3, cat: "cliche", repl: [""], note: "Мотивационный штамп — назовите сами возможности." },
        { p: "расширить границы", w: 2, cat: "cliche", repl: [""], note: "Мотивационный штамп." },
        { p: "вот ключевой вывод", w: 4, cat: "aiphrase", repl: [""], note: "Самоанонс вывода — почерк чат-бота." },
        { p: "по своей сути", w: 2, cat: "filler", repl: [""], note: "Пустая вводная." },
        { p: "без прикрас", w: 2, cat: "aiphrase", repl: [""], note: "Самомаркировка честности — почерк генерации." },
        { p: "без воды", w: 2, cat: "aiphrase", repl: [""], note: "Самомаркировка — почерк генерации." },
        { p: "это не очередной", w: 3, cat: "aiphrase", repl: [""], note: "Рекламный зачин «это не очередной…»." },
        { p: "мораль этой истории", w: 3, cat: "aiphrase", repl: [""], note: "Финальная мораль — почерк генерации." },
        { p: "надеюсь это было полезно", w: 5, cat: "aiphrase", repl: [""], note: "Реплика чат-бота, забытая в тексте." }
      ],

      en: [
        // ---- aiphrase ----
        { p: "as an ai language model", w: 5, cat: "aiphrase",
          repl: [""], note: "Прямое самоописание модели — абсолютный маркер." },
        { p: "i hope this helps", w: 5, cat: "aiphrase",
          repl: [""], note: "Каноническая концовка ответа чат-бота." },
        { p: "certainly! here", w: 5, cat: "aiphrase",
          repl: [""], note: "След начала ответа ассистента, забытый при копировании." },
        { p: "as of my last update", w: 5, cat: "aiphrase",
          repl: [""], note: "Оговорка о срезе знаний — пишет только LLM." },
        { p: "i don't have access to", w: 5, cat: "aiphrase",
          repl: [""], note: "Служебное ограничение ассистента в тексте." },
        { p: "i'm unable to", w: 3, cat: "aiphrase",
          repl: [""], note: "Формула вежливого отказа модели." },
        { p: "great question", w: 4, cat: "aiphrase",
          repl: [""], note: "Комплимент вопросу — разговорный тик чат-бота." },
        { p: "happy to help", w: 4, cat: "aiphrase",
          repl: [""], note: "Дежурная вежливость ассистента." },
        { p: "feel free to", w: 2, cat: "aiphrase",
          repl: [""], note: "Типовое приглашение из ответов модели." },
        { p: "don't hesitate to", w: 3, cat: "aiphrase",
          repl: [""], note: "Шаблонная вежливость деловой генерации." },
        { p: "reach out", w: 2, cat: "aiphrase",
          repl: ["contact"], note: "Корпоративный эвфемизм для «связаться»." },
        { p: "in this article we will", w: 4, cat: "aiphrase",
          repl: [""], note: "Каноническое вступление сгенерированной статьи." },
        { p: "in this blog post", w: 3, cat: "aiphrase",
          repl: [""], note: "Самоописание текста в стиле генерации." },
        { p: "in this guide", w: 3, cat: "aiphrase",
          repl: [""], note: "Шаблонная самопрезентация сгенерированного гайда." },
        { p: "without further ado", w: 3, cat: "aiphrase",
          repl: [""], note: "Дежурная подводка перед основной частью." },
        { p: "keep in mind", w: 2, cat: "aiphrase",
          repl: [""], note: "Менторское напоминание из ответов ассистента." },
        { p: "needless to say", w: 2, cat: "aiphrase",
          repl: [""], note: "Вводная-паразит перед очевидным утверждением." },
        { p: "key takeaways", w: 2, cat: "aiphrase",
          repl: [""], note: "Шаблонная рубрика выводов в структуре ответа ИИ." },
        { p: "final thoughts", w: 3, cat: "aiphrase",
          repl: [""], note: "Дежурный заголовок финала сгенерированного поста." },

        // ---- cliche ----
        { p: "it is important to note", w: 4, cat: "cliche",
          repl: [""], note: "Классическая оговорка LLM перед любым фактом." },
        { p: "it's worth noting", w: 4, cat: "cliche",
          repl: [""], note: "Вторая по частоте оговорка генеративного текста." },
        { p: "it goes without saying", w: 3, cat: "cliche",
          repl: [""], note: "Вводная, отменяющая сама себя, — частый тик ИИ." },
        { p: "in today's fast-paced world", w: 5, cat: "cliche",
          repl: [""], note: "Эталонный зачин сгенерированной статьи." },
        { p: "ever-evolving landscape", w: 5, cat: "cliche",
          repl: [""], note: "Знаменитая связка двух слов-маркеров ChatGPT." },
        { p: "in the digital age", w: 4, cat: "cliche",
          repl: [""], note: "Пафосная привязка к цифровой эпохе." },
        { p: "in an era of", w: 3, cat: "cliche",
          repl: [""], note: "Шаблонная историческая рамка генерации." },
        { p: "rapidly evolving", w: 3, cat: "cliche",
          repl: ["changing"], note: "Дежурный эпитет скорости перемен." },
        { p: "the world of", w: 3, cat: "cliche",
          repl: [""], note: "Формула «мир чего-угодно» из генеративных статей." },
        { p: "whether you are a beginner or", w: 4, cat: "cliche",
          repl: [""], note: "Шаблонный охват аудитории в сгенерированных гайдах." },
        { p: "when it comes to", w: 2, cat: "cliche",
          repl: [""], note: "Связка-паразит, которой ИИ начинает абзацы." },
        { p: "at the end of the day", w: 3, cat: "cliche",
          repl: [""], note: "Затертая разговорная формула вывода." },
        { p: "look no further", w: 4, cat: "cliche",
          repl: [""], note: "Продажный штамп сгенерированного маркетинга." },
        { p: "take it to the next level", w: 4, cat: "cliche",
          repl: ["improve"], note: "Эталонный мотивационный штамп генерации." },
        { p: "a testament to", w: 4, cat: "cliche",
          repl: ["shows"], note: "Книжная формула-маркер стиля ChatGPT." },
        { p: "plays a vital role", w: 4, cat: "cliche",
          repl: ["matters"], note: "Штамп о важной роли — визитка генерации." },
        { p: "cannot be overstated", w: 4, cat: "cliche",
          repl: [""], note: "Гипербола важности, любимая моделью." },
        { p: "highlights the importance", w: 3, cat: "cliche",
          repl: [""], note: "Формула значимости без объяснения." },
        { p: "navigate the complexities", w: 4, cat: "cliche",
          repl: [""], note: "Метафора навигации — частотный оборот LLM." },
        { p: "at its core", w: 2, cat: "cliche",
          repl: [""], note: "Дежурная формула «в своей основе»." },
        { p: "at the forefront", w: 3, cat: "cliche",
          repl: ["leading"], note: "Штамп о лидерстве без рейтинга." },
        { p: "pave the way", w: 3, cat: "cliche",
          repl: [""], note: "Затертая метафора прокладывания пути." },
        { p: "shaping the future", w: 3, cat: "cliche",
          repl: [""], note: "Пафосная формула будущего из генерации." },
        { p: "sets it apart", w: 3, cat: "cliche",
          repl: [""], note: "Шаблон отличия продукта в сгенерированных обзорах." },
        { p: "second to none", w: 3, cat: "cliche",
          repl: ["excellent"], note: "Рекламная превосходная степень." },
        { p: "a must-have", w: 3, cat: "cliche",
          repl: [""], note: "Продажный штамп обзоров, частый у ИИ." },
        { p: "hidden gem", w: 3, cat: "cliche",
          repl: [""], note: "Туристическо-обзорный штамп генерации." },
        { p: "treasure trove", w: 3, cat: "cliche",
          repl: [""], note: "Любимая метафора изобилия у ChatGPT." },
        { p: "best practices", w: 2, cat: "cliche",
          repl: [""], note: "Корпоративная формула без конкретных практик." },
        { p: "actionable insights", w: 3, cat: "cliche",
          repl: [""], note: "Бизнес-штамп из генеративной аналитики." },
        { p: "a wide range of", w: 3, cat: "cliche",
          repl: ["many"], note: "Дежурная формула ассортимента." },
        { p: "endless possibilities", w: 3, cat: "cliche",
          repl: [""], note: "Гипербола возможностей без примеров." },
        { p: "push the boundaries", w: 3, cat: "cliche",
          repl: [""], note: "Штамп о новаторстве из генеративных текстов." },
        { p: "embark on a journey", w: 4, cat: "cliche",
          repl: ["start"], note: "Метафора путешествия — фирменный ход LLM." },
        { p: "dive into", w: 3, cat: "cliche",
          repl: ["explore"], note: "Любимый глагол погружения у ChatGPT." },
        { p: "deep dive", w: 3, cat: "cliche",
          repl: ["detailed look"], note: "Штамп «глубокого разбора» из генерации." },
        { p: "delve", w: 4, cat: "cliche",
          repl: ["explore", "look into"], note: "Самое известное слово-маркер ChatGPT." },
        { p: "tapestry", w: 4, cat: "cliche",
          repl: [""], note: "Знаменитая метафора «гобелена», выдающая генерацию." },
        { p: "landscape", w: 3, cat: "cliche",
          repl: ["field", "market"], note: "Метафора «ландшафта» для любой отрасли — тик LLM." },
        { p: "realm", w: 3, cat: "cliche",
          repl: ["area"], note: "Книжное «королевство» вместо простого «область»." },
        { p: "in the realm of", w: 4, cat: "cliche",
          repl: ["in"], note: "Развернутая версия realm — частотный оборот ИИ." },
        { p: "intricate", w: 3, cat: "cliche",
          repl: ["complex"], note: "Любимый эпитет сложности у ChatGPT." },
        { p: "multifaceted", w: 3, cat: "cliche",
          repl: ["varied"], note: "Наукообразный эпитет-маркер генерации." },
        { p: "myriad", w: 3, cat: "cliche",
          repl: ["many"], note: "Книжное слово, частое в генеративном английском." },
        { p: "plethora", w: 3, cat: "cliche",
          repl: ["plenty"], note: "Вычурное слово изобилия — маркер LLM." },
        { p: "underscores", w: 3, cat: "cliche",
          repl: ["shows"], note: "Академичный глагол подчеркивания, любимый моделью." },
        { p: "meticulous", w: 3, cat: "cliche",
          repl: ["careful"], note: "Частотный эпитет тщательности у ChatGPT." },
        { p: "demystify", w: 3, cat: "cliche",
          repl: ["explain"], note: "Шаблонный глагол сгенерированных объяснялок." },
        { p: "unravel", w: 3, cat: "cliche",
          repl: ["explain"], note: "Метафора распутывания тайн из генерации." },
        { p: "foster", w: 3, cat: "cliche",
          repl: ["support"], note: "Канцелярский глагол-маркер генеративного английского." },
        { p: "harness", w: 3, cat: "cliche",
          repl: ["use"], note: "Пафосное «обуздать» вместо простого «использовать»." },
        { p: "cultivate", w: 2, cat: "cliche",
          repl: ["build"], note: "Садоводческая метафора из мотивационной генерации." },
        { p: "bolster", w: 3, cat: "cliche",
          repl: ["strengthen"], note: "Книжный глагол усиления, частый у LLM." },
        { p: "augment", w: 3, cat: "cliche",
          repl: ["add to"], note: "Латинизм вместо простого «расширить»." },
        { p: "it is essential to", w: 3, cat: "cliche",
          repl: [""], note: "Менторская вводная обязательности от модели." },

        // ---- transition ----
        { p: "moreover", w: 3, cat: "transition",
          repl: ["also"], note: "Книжная связка, которой ИИ начинает абзацы." },
        { p: "furthermore", w: 3, cat: "transition",
          repl: ["also"], note: "Академичный переход — частотный маркер генерации." },
        { p: "in conclusion", w: 3, cat: "transition",
          repl: [""], note: "Формульный сигнал финала сгенерированного эссе." },
        { p: "in summary", w: 3, cat: "transition",
          repl: [""], note: "Шаблонная рубрика итога в ответе модели." },
        { p: "to sum up", w: 3, cat: "transition",
          repl: [""], note: "Школьная формула подведения итогов." },
        { p: "first and foremost", w: 3, cat: "transition",
          repl: ["first"], note: "Избыточный усилитель «во-первых»." },
        { p: "last but not least", w: 3, cat: "transition",
          repl: ["finally"], note: "Дежурная формула последнего пункта списка." },
        { p: "additionally", w: 2, cat: "transition",
          repl: ["also"], note: "Механическая добавка между абзацами генерации." },
        { p: "notably", w: 2, cat: "transition",
          repl: [""], note: "Академичное выделение без объяснения важности." },
        { p: "ultimately", w: 2, cat: "transition",
          repl: [""], note: "Дежурное слово финального абзаца ИИ." },
        { p: "that being said", w: 2, cat: "transition",
          repl: ["still"], note: "Формульная уступка перед противопоставлением." },
        { p: "in essence", w: 2, cat: "transition",
          repl: [""], note: "Пересказ той же мысли под видом сути." },

        // ---- bureaucratic ----
        { p: "it should be noted", w: 3, cat: "bureaucratic",
          repl: [""], note: "Безличная канцелярская оговорка из генерации." },
        { p: "in order to", w: 2, cat: "bureaucratic",
          repl: ["to"], note: "Раздутая версия простого to." },
        { p: "due to the fact that", w: 3, cat: "bureaucratic",
          repl: ["because"], note: "Пятисловная замена слова because." },
        { p: "a number of", w: 2, cat: "bureaucratic",
          repl: ["several"], note: "Размытое количество вместо конкретного числа." },
        { p: "with regard to", w: 2, cat: "bureaucratic",
          repl: ["about"], note: "Канцелярский предлог деловой переписки." },

        // ---- buzzword ----
        { p: "leverage", w: 3, cat: "buzzword",
          repl: ["use"], note: "Корпоративный глагол вместо простого use." },
        { p: "seamless", w: 3, cat: "buzzword",
          repl: ["smooth"], note: "Дежурный эпитет генеративного маркетинга." },
        { p: "seamlessly", w: 3, cat: "buzzword",
          repl: ["smoothly"], note: "Наречие-маркер сгенерированных описаний продуктов." },
        { p: "robust", w: 3, cat: "buzzword",
          repl: ["reliable"], note: "Любимый технический эпитет LLM." },
        { p: "comprehensive", w: 2, cat: "buzzword",
          repl: ["full"], note: "Частотный эпитет полноты в генерации." },
        { p: "crucial", w: 2, cat: "buzzword",
          repl: ["important"], note: "Слово-усилитель, которым модель заменяет important." },
        { p: "pivotal", w: 3, cat: "buzzword",
          repl: ["key"], note: "Книжный синоним important — маркер генерации." },
        { p: "holistic", w: 3, cat: "buzzword",
          repl: ["complete"], note: "Модный эпитет «целостности» без содержания." },
        { p: "synergy", w: 4, cat: "buzzword",
          repl: ["combined effect"], note: "Эталонный корпоративный жаргон." },
        { p: "streamline", w: 3, cat: "buzzword",
          repl: ["simplify"], note: "Бизнес-глагол оптимизации из генерации." },
        { p: "boost", w: 2, cat: "buzzword",
          repl: ["increase"], note: "Маркетинговый глагол роста без цифр." },
        { p: "cutting-edge", w: 3, cat: "buzzword",
          repl: ["modern"], note: "Рекламный эпитет передовитости." },
        { p: "state-of-the-art", w: 3, cat: "buzzword",
          repl: ["modern"], note: "Дежурный эпитет «новейший» из генерации." },
        { p: "user-friendly", w: 3, cat: "buzzword",
          repl: ["easy to use"], note: "Обязательный эпитет сгенерированных обзоров софта." },
        { p: "intuitive", w: 2, cat: "buzzword",
          repl: ["simple"], note: "Штамп об интерфейсе без примеров удобства." },
        { p: "data-driven", w: 2, cat: "buzzword",
          repl: [""], note: "Модный эпитет аналитичности." },
        { p: "results-driven", w: 3, cat: "buzzword",
          repl: [""], note: "Пустой корпоративный эпитет." },
        { p: "mission-critical", w: 3, cat: "buzzword",
          repl: ["vital"], note: "Корпоративная драматизация важности." },
        { p: "move the needle", w: 3, cat: "buzzword",
          repl: ["make a difference"], note: "Менеджерская идиома из генеративных текстов." },
        { p: "low-hanging fruit", w: 3, cat: "buzzword",
          repl: ["easy wins"], note: "Затертая корпоративная метафора." },
        { p: "one-stop shop", w: 3, cat: "buzzword",
          repl: [""], note: "Продажный штамп «все в одном месте»." },
        { p: "end-to-end", w: 2, cat: "buzzword",
          repl: ["complete"], note: "Технический жаргон полного цикла." },
        { p: "paradigm shift", w: 3, cat: "buzzword",
          repl: ["big change"], note: "Наукообразная гипербола перемен." },
        { p: "game-changer", w: 4, cat: "buzzword",
          repl: ["big improvement"], note: "Эталонный хайповый штамп генерации." },
        { p: "optimize", w: 2, cat: "buzzword",
          repl: ["improve"], note: "Дежурный глагол улучшения без метрик." },
        { p: "supercharge", w: 3, cat: "buzzword",
          repl: ["improve"], note: "Маркетинговый глагол-усилитель из генерации." },
        { p: "skyrocket", w: 3, cat: "buzzword",
          repl: ["grow fast"], note: "Гиперболический глагол роста без данных." },
        { p: "spearhead", w: 3, cat: "buzzword",
          repl: ["lead"], note: "Военная метафора лидерства из корпоративной генерации." },

        // ---- hype ----
        { p: "unlock", w: 3, cat: "hype",
          repl: ["open", "enable"], note: "Метафора «разблокировки» — частотный маркер LLM." },
        { p: "unlock the potential", w: 4, cat: "hype",
          repl: [""], note: "Полная формула хайпового обещания от ИИ." },
        { p: "unleash", w: 3, cat: "hype",
          repl: ["release"], note: "Пафосный глагол «высвобождения» из генерации." },
        { p: "elevate", w: 3, cat: "hype",
          repl: ["improve"], note: "Модный глагол возвышения — визитка ChatGPT." },
        { p: "empower", w: 3, cat: "hype",
          repl: ["help"], note: "Мотивационный глагол-маркер генеративного текста." },
        { p: "revolutionize", w: 3, cat: "hype",
          repl: ["change"], note: "Гипербола революции о любом продукте." },
        { p: "transformative", w: 3, cat: "hype",
          repl: [""], note: "Дежурный эпитет трансформации без деталей." },
        { p: "groundbreaking", w: 3, cat: "hype",
          repl: ["new"], note: "Рекламная гипербола новизны." },
        { p: "unprecedented", w: 3, cat: "hype",
          repl: ["rare"], note: "Любимое усиление масштабности у LLM." },
        { p: "breathtaking", w: 3, cat: "hype",
          repl: [""], note: "Туристическая гипербола из генерации." },
        { p: "captivating", w: 3, cat: "hype",
          repl: ["interesting"], note: "Частотный восторженный эпитет модели." },
        { p: "invaluable", w: 2, cat: "hype",
          repl: ["useful"], note: "Гипербола ценности без обоснования." },
        { p: "indispensable", w: 3, cat: "hype",
          repl: ["useful"], note: "Штамп незаменимости из генеративных обзоров." },
        { p: "unparalleled", w: 3, cat: "hype",
          repl: ["great"], note: "Превосходная степень без сравнения." },
        { p: "vibrant", w: 3, cat: "hype",
          repl: ["lively"], note: "Дежурный эпитет ChatGPT для городов и сообществ." },
        { p: "bustling", w: 3, cat: "hype",
          repl: ["busy"], note: "Туристический эпитет-маркер генерации." },
        { p: "nestled", w: 3, cat: "hype",
          repl: ["located"], note: "Знаменитое «уютно расположенный» из текстов ИИ." },
        { p: "redefine", w: 2, cat: "hype",
          repl: ["change"], note: "Хайповый глагол переосмысления." },
        { p: "reimagine", w: 3, cat: "hype",
          repl: ["rethink"], note: "Модный глагол из маркетинговой генерации." },

        // ---- filler ----
        { p: "generally speaking", w: 2, cat: "filler",
          repl: [""], note: "Уклончивая рамка перед обобщением." },
        { p: "some might say", w: 2, cat: "filler",
          repl: [""], note: "Анонимное мнение — уклончивый прием генерации." }
      ]
    },

    starters: {
      ru: [
        "таким образом",
        "кроме того",
        "более того",
        "однако",
        "также",
        "помимо этого",
        "в итоге",
        "итак",
        "следовательно",
        "во-первых",
        "во-вторых",
        "в-третьих",
        "наконец",
        "стоит отметить",
        "важно отметить",
        "в целом",
        "безусловно",
        "несомненно",
        "действительно",
        "конечно",
        "например",
        "к тому же",
        "при этом",
        "тем не менее",
        "в результате",
        "с другой стороны",
        "с одной стороны",
        "в заключение",
        "подводя итог",
        "резюмируя",
        "как уже упоминалось",
        "прежде всего",
        "в первую очередь",
        "вместе с тем",
        "соответственно",
        "иными словами"
      ],
      en: [
        "moreover",
        "furthermore",
        "additionally",
        "however",
        "therefore",
        "consequently",
        "in conclusion",
        "in summary",
        "overall",
        "firstly",
        "secondly",
        "thirdly",
        "finally",
        "notably",
        "importantly",
        "ultimately",
        "as mentioned",
        "in addition",
        "on the other hand",
        "that being said",
        "with that in mind",
        "indeed",
        "essentially",
        "generally",
        "similarly",
        "subsequently",
        "meanwhile",
        "nevertheless",
        "nonetheless",
        "in essence"
      ]
    },

    bureaucratic: {
      ru: [
        "является",
        "являются",
        "являлся",
        "осуществляется",
        "осуществлять",
        "осуществление",
        "обеспечивается",
        "обеспечивать",
        "обеспечение",
        "реализуется",
        "реализация",
        "функционирует",
        "функционирование",
        "характеризуется",
        "предоставляется",
        "предоставление",
        "производится",
        "выполняется",
        "применяется",
        "применение",
        "используется",
        "использование",
        "позволяет",
        "способствует",
        "обуславливает",
        "представляет собой",
        "имеет возможность",
        "имеет место",
        "в соответствии с",
        "посредством",
        "путем",
        "ввиду",
        "вследствие",
        "данный",
        "данного",
        "указанный",
        "вышеуказанный",
        "вышеупомянутый",
        "соответствующий",
        "определенный",
        "различный",
        "многочисленный",
        "надлежащий",
        "целесообразный",
        "регламентируется",
        "эксплуатация",
        "внедрение",
        "задействовать",
        "модернизация",
        "оптимизация",
        "уделяется внимание",
        "внимание уделяется",
        "внимание уделено"
      ],
      en: [
        "utilize",
        "utilization",
        "facilitate",
        "implement",
        "implementation",
        "aforementioned",
        "subsequently",
        "endeavor",
        "commence",
        "terminate",
        "ascertain",
        "expedite",
        "procure",
        "disseminate",
        "aggregate",
        "delineate",
        "elucidate",
        "exemplify",
        "necessitate",
        "constitute",
        "pertain",
        "comprise",
        "henceforth",
        "thereby",
        "whereby",
        "notwithstanding"
      ]
    },

    humanMarkers: {
      ru: [
        "короче",
        "кароч",
        "короче говоря",
        "кстати",
        "честно говоря",
        "если честно",
        "скажу честно",
        "не буду врать",
        "признаюсь",
        "на самом деле",
        "по-моему",
        "по моему опыту",
        "у меня",
        "я думаю",
        "я считаю",
        "мне кажется",
        "лично я",
        "лично мне",
        "в моем случае",
        "мы у себя",
        "у нас в",
        "к сожалению у нас",
        "блин",
        "черт",
        "капец",
        "жесть",
        "прикол",
        "прикинь",
        "фигня",
        "штука",
        "типа",
        "вроде",
        "как бы",
        "ну и",
        "вот такой",
        "ну такое",
        "имхо",
        "зашло",
        "спойлер",
        "забегая вперед",
        "плюс-минус",
        "на глаз",
        "на глазок",
        "методом тыка",
        "грабли",
        "костыль",
        "костыли",
        "велосипед",
        "танцы с бубном",
        "спасибо",
        "увы",
        "поначалу",
        "по началу",
        "помню",
        "однажды",
        "как-то раз",
        "недавно",
        "вчера",
        "сегодня утром",
        "полгода назад",
        "пару лет назад",
        "по ощущениям",
        "оказалось"
      ],
      en: [
        "honestly",
        "to be fair",
        "in my experience",
        "i think",
        "i guess",
        "kinda",
        "sorta",
        "stuff",
        "btw",
        "fwiw",
        "tbh",
        "imo",
        "imho",
        "lol",
        "yeah",
        "gotcha",
        "long story short",
        "spoiler",
        "i remember",
        "last year",
        "a while back",
        "turns out",
        "my bad",
        "heads up",
        "we ended up",
        "no idea",
        "anyway",
        "i tried"
      ]
    }
  };
});

/*
 * Посентенс-анализ — балл «машинности» для каждого предложения.
 *
 * Зачем отдельно от detector.js: словарь ловит слова, а читателя отталкивает
 * предложение целиком. Внешние детекторы (ZeroGPT, Merlin) подсвечивают именно
 * предложения — и это единственное, что они умеют показать. Мы показываем то же,
 * но с объяснением: за каждым баллом стоит список конкретных причин.
 *
 * Всё считается локально и детерминированно, без нейросети.
 *
 * Веса подобраны не на глаз: проверены на 106 предложениях сырой генерации
 * против 1749 предложений вычищенных кейсов. AUC 0.857; при пороге 38 ловится
 * 35% машинных предложений при 0.5% ложных срабатываний на живом тексте.
 *
 * Признаки, идущие в балл (ни один не требует модели), по убыванию силы:
 *   Канцелярит          — 41.5% у генерации против 0.8% у живого текста
 *   Отглагольные сущ.   — 33.0% против 7.5%
 *   Штампы из базы      — 26.4% против 0.7%
 *   Шаблонное начало    — 16.0% против 0.4%
 *   Нет опоры           — 72.6% против 50.3% (слабый: часто и у живого)
 *   Ровность по длине   — 32.1% против 19.9% (совсем слабый)
 *
 * Признаки, НЕ идущие в балл — редакторские заметки (editorial: true):
 *   Перечислительный ряд — 16.0% у генерации против 26.6% у живого текста.
 *     Признак развёрнут в обратную сторону: длинные ряды однородных членов —
 *     это почерк кейса, а не машины. ZeroGPT подсвечивает их как ИИ; мы
 *     проверили и повторять его ошибку не стали.
 *   Повтор по тексту — 0.0% против 5.9%: в длинных кейсах разделы естественно
 *     перекликаются. Автору сказать полезно, к ИИ отношения не имеет.
 *
 * Табличные и списочные строки из повтора и ровности исключаются: повтор внутри
 * таблицы — это структура данных, а не почерк генерации.
 *
 * API:
 *   Sentences.analyze(text, sentences, ctx) -> [{start,end,score,level,reasons,features}]
 *     sentences — из AIDetector.splitSentences(text)
 *     ctx = { hits, burHits, starterHits }  — находки словаря с офсетами
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  if (root) { root.Sentences = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function countWords(s) {
    var m = s.match(/[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\-']*/g);
    return m ? m.length : 0;
  }
  function normalize(s) {
    return s.toLowerCase().replace(/ё/g, 'е')
      .replace(/[^а-яa-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* -------- таблицы и списки --------
   * Строка считается структурной, если это пункт списка, строка с табуляциями
   * или короткая строка без завершающей точки, стоящая среди подобных.
   * Такие строки не штрафуем за повтор и за ровность длины.
   */
  function structuralRanges(text) {
    var ranges = [], pos = 0;
    var lines = text.split('\n');
    var flags = lines.map(function (ln) {
      var t = ln.trim();
      if (!t) return false;
      if ((ln.match(/\t/g) || []).length >= 2) return true;          // строка таблицы
      if (/^([-–—•*▪●○]|\d{1,2}[.)])\s+/.test(t)) return true;        // пункт списка
      if (t.length <= 60 && countWords(t) <= 8 && !/[.!?…]$/.test(t)) return true; // ячейка/заголовок
      return false;
    });
    // одиночная короткая строка среди прозы — это заголовок, а не таблица:
    // структурной считаем только там, где рядом есть такая же
    for (var i = 0; i < lines.length; i++) {
      var neighbour = (i > 0 && flags[i - 1]) || (i < lines.length - 1 && flags[i + 1]);
      var isStruct = flags[i] && (neighbour || (lines[i].match(/\t/g) || []).length >= 2);
      if (isStruct) ranges.push([pos, pos + lines[i].length]);
      pos += lines[i].length + 1;
    }
    return ranges;
  }

  function inRanges(start, ranges) {
    for (var i = 0; i < ranges.length; i++) {
      if (start >= ranges[i][0] && start < ranges[i][1]) return true;
    }
    return false;
  }

  /* -------- признаки одного предложения -------- */

  // Самая длинная цепочка однородных членов: «a, b, c и d» -> 4
  function longestChain(s) {
    var best = 0;
    s.split(/[.!?…]/).forEach(function (clause) {
      clause.split(/[:—–]/).forEach(function (run) {
        var parts = run.split(/,\s*|\s+и\s+/).filter(function (p) { return p.trim().length > 1; });
        if (parts.length > best) best = parts.length;
      });
    });
    return best;
  }

  function features(s, ctx) {
    var low = s.toLowerCase();
    var words = countWords(s);
    var abstr = (low.match(/[а-яё]{3,}(ени[еяю]|ани[еяю]|аци[июя]|ост[ьию]|ств[оае])(?![а-яё])/g) || []).length;
    return {
      words: words,
      chain: longestChain(s),
      abstr: abstr,
      abstrPer10: words ? abstr / words * 10 : 0,
      digits: (s.match(/\d/g) || []).length,
      quotes: (s.match(/«[^»]{3,}»/g) || []).length,
      latin: (s.match(/[A-Za-z]{2,}/g) || []).length,
      // имя собственное не в начале предложения
      proper: (s.slice(1).match(/[^.!?]\s[А-ЯЁ][а-яё]{2,}/g) || []).length
    };
  }

  /* -------- основной разбор -------- */

  function analyze(text, sentences, ctx) {
    ctx = ctx || {};
    var struct = structuralRanges(text);

    var live = sentences.filter(function (s) { return countWords(s.text) >= 6; });
    if (!live.length) return [];

    var meanLen = live.reduce(function (a, s) { return a + countWords(s.text); }, 0) / live.length;

    // 3-граммы всего документа — для поиска эха (структурные строки не в счёт)
    var tri = {};
    live.forEach(function (s) {
      if (inRanges(s.start, struct)) return;
      var tk = normalize(s.text).split(' ').filter(Boolean);
      for (var i = 0; i + 2 < tk.length; i++) {
        var g = tk[i] + ' ' + tk[i + 1] + ' ' + tk[i + 2];
        tri[g] = (tri[g] || 0) + 1;
      }
    });

    function hitsIn(list, s) {
      if (!list) return [];
      return list.filter(function (h) { return h.start >= s.start && h.start < s.end; });
    }

    return live.map(function (s) {
      var f = features(s.text, ctx);
      var isStruct = inRanges(s.start, struct);
      var reasons = [], score = 0;

      // 1. перечислительный ряд — РЕДАКТОРСКАЯ заметка, не признак ИИ.
      // Проверка на 106 предложениях сырой генерации против 1749 вычищенных
      // показала обратное тому, что мы предполагали: длинные ряды однородных
      // членов встречаются в живых кейсах ЧАЩЕ (26.6%), чем в генерации (16.0%).
      // Внешние детекторы подсвечивают их как «ИИ» — это их ложное срабатывание,
      // и повторять его мы не будем. Автору сказать стоит, в балл не берём.
      if (f.chain >= 5) {
        reasons.push({ code: 'chain', title: 'Длинный перечислительный ряд', editorial: true,
          detail: 'Однородных членов подряд: ' + f.chain + '. На ИИ это не указывает, но ряд ' +
                  'из пяти и больше элементов тяжело читается — подумайте, не разбить ли его.' });
      }

      // 2. отглагольные существительные
      if (f.abstrPer10 >= 1.2) {
        score += clamp((f.abstrPer10 - 1.0) * 22, 0, 30);
        reasons.push({ code: 'abstr', title: 'Отглагольные существительные',
          detail: 'Слов на -ение/-ание/-ация/-ость: ' + f.abstr + ' на ' + f.words +
                  ' слов. Замените их глаголами: «осуществляется доставка» → «доставляем».' });
      }

      // 3. штампы и канцелярит из базы, попавшие в это предложение
      var cl = hitsIn(ctx.hits, s), bu = hitsIn(ctx.burHits, s), st = hitsIn(ctx.starterHits, s);
      if (cl.length) {
        score += clamp(cl.reduce(function (a, h) { return a + (h.w || 1); }, 0) * 11, 0, 42);
        // синтаксические шаблоны («не X, а Y») — отдельной причиной: у них своё объяснение
        var pat = cl.filter(function (h) { return h.cat === 'pattern'; });
        var lex = cl.filter(function (h) { return h.cat !== 'pattern'; });
        if (lex.length) reasons.push({ code: 'cliche', title: 'Штамп из базы',
          detail: lex.map(function (h) { return '«' + h.match + '»'; }).join(', ') });
        pat.forEach(function (h) {
          reasons.push({ code: 'pattern', title: 'Шаблон ИИ: ' + h.phrase, detail: h.note });
        });
      }

      // 3б. два тире и больше в одном предложении. Почерк Claude: 9% его
      // предложений против 1.1–1.4% у живых авторов и в вычищенных кейсах.
      // Одно тире не штрафуем — у людей оно в 10–15% предложений.
      var dashes = (s.text.match(/\s[—–]\s/g) || []).length;
      if (dashes >= 2) {
        score += 16;
        reasons.push({ code: 'dashes', title: 'Тире-пояснения подряд',
          detail: 'Тире в предложении: ' + dashes + '. Цепочка пояснений через тире — почерк Claude; ' +
                  'разверните одно из пояснений в отдельное предложение.' });
      }
      if (bu.length) {
        score += clamp(bu.length * 13, 0, 34);
        reasons.push({ code: 'bur', title: 'Канцелярит',
          detail: bu.map(function (h) { return '«' + h.match + '»'; }).join(', ') });
      }
      if (st.length) {
        score += 20;
        reasons.push({ code: 'starter', title: 'Шаблонное начало',
          detail: '«' + st[0].match + '» — начните с сути: с существительного, глагола или цифры.' });
      }

      // 4. эхо по документу
      var echoShare = 0;
      if (!isStruct) {
        var tk = normalize(s.text).split(' ').filter(Boolean), echo = 0, n = 0;
        for (var i = 0; i + 2 < tk.length; i++) {
          n++;
          if ((tri[tk[i] + ' ' + tk[i + 1] + ' ' + tk[i + 2]] || 0) > 1) echo++;
        }
        echoShare = n ? echo / n : 0;
        // Признаком ИИ не является: на проверке срабатывал только на живых
        // текстах (5.9% против 0.0% у генерации) — в длинных кейсах разделы
        // естественно перекликаются. Оставляем как редакторскую заметку.
        if (echoShare >= 0.3) {
          reasons.push({ code: 'echo', title: 'Повтор по тексту', editorial: true,
            detail: Math.round(echoShare * 100) + '% словосочетаний этого предложения уже ' +
                    'встречались в других местах документа — проверьте, не дублируется ли мысль.' });
        }
      }

      // 5. ни одной опоры: ни числа, ни имени, ни кавычек, ни термина
      var anchors = f.digits + f.quotes + f.latin + f.proper;
      if (!anchors && f.words >= 10) {
        score += 9;
        reasons.push({ code: 'noanchor', title: 'Нет ни одной конкретной опоры',
          detail: 'Ни числа, ни названия, ни цитаты интерфейса. Такое предложение можно ' +
                  'вставить в кейс о любом другом проекте — и никто не заметит.' });
      }

      // 6. ровность по длине — слабый признак, поэтому и вес маленький
      if (!isStruct && meanLen) {
        var dev = Math.abs(f.words - meanLen) / meanLen;
        if (dev < 0.10 && f.words >= 10) {
          score += 3;
          reasons.push({ code: 'flat', title: 'Длина ровно средняя',
            detail: 'Ровно ' + f.words + ' слов при среднем ' + Math.round(meanLen) +
                    '. Сама по себе мелочь, но в связке с остальным — признак ровного машинного ритма.' });
        }
      }

      score = clamp(Math.round(score), 0, 100);
      var level = score >= 58 ? 'AI' : score >= 38 ? 'LIKELY_AI' : score >= 20 ? 'LIKELY_HUMAN' : 'HUMAN';
      if (!reasons.length) {
        reasons.push({ code: 'ok', title: 'Машинных признаков не найдено', detail: '' });
      }
      return {
        start: s.start, end: s.end, score: score, level: level,
        structural: isStruct, reasons: reasons,
        preview: s.text.slice(0, 160),
        features: { chain: f.chain, abstr: f.abstr, words: f.words,
                    anchors: anchors, echo: Math.round(echoShare * 100) }
      };
    });
  }

  return { analyze: analyze, structuralRanges: structuralRanges, longestChain: longestChain };
});

/*
 * AI Detector — ядро анализа.
 * Детерминированный статистический движок: одинаковый текст и настройки
 * всегда дают одинаковый результат. Работает локально, без сети.
 *
 * API:
 *   AIDetector.analyze(text, kb, options) -> report
 *   options: {
 *     lang: 'auto'|'ru'|'en',
 *     profile: 'strict'|'balanced'|'soft',
 *     segmentSize: number (симв., по умолчанию 900),
 *     markdownAware: bool,   // структура (списки/заголовки) задумана автором
 *     whitelist: [строки]    // фразы-исключения
 *   }
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) { module.exports = mod; }
  if (root) { root.AIDetector = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------------- утилиты ---------------- */

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  // Кусочно-линейное отображение x -> 0..100 по опорным точкам [[x,y],...]
  function scale(x, pts) {
    if (x <= pts[0][0]) return pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      if (x <= pts[i][0]) {
        var a = pts[i - 1], b = pts[i];
        return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      }
    }
    return pts[pts.length - 1][1];
  }

  function mean(arr) {
    if (!arr.length) return 0;
    var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
  }
  function stdev(arr) {
    if (arr.length < 2) return 0;
    var m = mean(arr), s = 0;
    for (var i = 0; i < arr.length; i++) s += (arr[i] - m) * (arr[i] - m);
    return Math.sqrt(s / (arr.length - 1));
  }
  function cv(arr) { var m = mean(arr); return m ? stdev(arr) / m : 0; }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* ---------------- токенизация ---------------- */

  var ABBR = ['т.д', 'т.п', 'т.е', 'т.к', 'т.н', 'и.о', 'н.э', 'др', 'пр', 'руб',
    'коп', 'тыс', 'млн', 'млрд', 'г', 'гг', 'в', 'вв', 'см', 'рис', 'табл', 'стр',
    'гл', 'им', 'ул', 'просп', 'пер', 'обл', 'кв', 'корп', 'оф', 'тел', 'достав',
    'e.g', 'i.e', 'etc', 'vs', 'mr', 'mrs', 'ms', 'dr', 'st', 'no', 'approx', 'inc', 'ltd'];

  // Разбивка на предложения с офсетами. Бережно к сокращениям и инициалам.
  function splitSentences(text) {
    var out = [];
    var re = /[.!?…]+[»")\]]*[ \t]+|\n+/g;
    var start = 0, m;
    while ((m = re.exec(text)) !== null) {
      var end = m.index + m[0].length;
      var isNewline = m[0].indexOf('\n') !== -1;
      if (!isNewline) {
        // слово перед точкой
        var beforeMatch = /([А-Яа-яЁёA-Za-z][а-яёa-z]*)\.?$/.exec(text.slice(Math.max(0, m.index - 12), m.index));
        var w = beforeMatch ? beforeMatch[1].toLowerCase() : '';
        var isAbbr = (w.length === 1) || ABBR.indexOf(w) !== -1;
        // "т.д." и подобные — точка внутри
        var tail2 = text.slice(Math.max(0, m.index - 4), m.index).toLowerCase();
        if (/[тие]\.[дпекн]$/.test(tail2)) isAbbr = true;
        var next = text[end];
        var nextLower = next && /[а-яёa-z]/.test(next);
        if (isAbbr || nextLower) continue; // не граница
      }
      var chunk = text.slice(start, end);
      if (chunk.trim()) out.push({ text: chunk.trim(), start: start, end: end });
      start = end;
    }
    if (start < text.length && text.slice(start).trim()) {
      out.push({ text: text.slice(start).trim(), start: start, end: text.length });
    }
    return out;
  }

  function countWords(s) {
    var m = s.match(/[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\-']*/g);
    return m ? m.length : 0;
  }

  function detectLang(text) {
    var cyr = (text.match(/[А-Яа-яЁё]/g) || []).length;
    var lat = (text.match(/[A-Za-z]/g) || []).length;
    if (cyr === 0 && lat === 0) return 'ru';
    return cyr >= lat ? 'ru' : 'en';
  }

  /* -------------- сопоставление фраз с допуском окончаний -------------- */

  var LOOKBEHIND_OK = (function () {
    try { new RegExp('(?<!a)b'); return true; } catch (e) { return false; }
  })();

  // Из "играет ключевую роль" делаем регэксп, терпимый к окончаниям слов.
  function phraseToRegex(p, flexTail) {
    var words = p.split(/\s+/);
    var single = words.length === 1;
    var parts = words.map(function (w) {
      var esc;
      if (/[а-яё]/i.test(w) && w.length >= 5) {
        var cut = w.length >= 7 ? 2 : 1;
        // Для однословных фраз хвост не длиннее отрезанного окончания:
        // иначе «производится» ловит «производителей», «внедрение» — «внедрению» и т.п.
        var tail = single ? cut : cut + (flexTail || 2);
        esc = escapeRe(w.slice(0, w.length - cut)) + '[а-яё]{0,' + tail + '}';
      } else if (/^[a-z]+$/i.test(w) && w.length >= 5) {
        esc = escapeRe(w) + '[a-z]{0,2}';
      } else {
        esc = escapeRe(w);
      }
      return esc;
    });
    var body = parts.join('[\\s,]+');
    var src = LOOKBEHIND_OK
      ? '(?<![А-Яа-яЁёA-Za-z])' + body + '(?![А-Яа-яЁёA-Za-z])'
      : body + '(?![А-Яа-яЁёA-Za-z])';
    return new RegExp(src, 'gi');
  }

  var regexCache = {};
  function cachedRegex(key, p, flexTail) {
    if (!regexCache[key]) regexCache[key] = phraseToRegex(p, flexTail);
    regexCache[key].lastIndex = 0;
    return regexCache[key];
  }

  // Поиск всех вхождений фраз из списка entries [{p,w,cat,repl,note}]
  function findPhraseHits(lowerText, entries, whitelist, kind) {
    var hits = [];
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (whitelist && whitelist.indexOf(e.p) !== -1) continue;
      // Синтаксические шаблоны («не X, а Y») словарной фразой не описать,
      // поэтому у таких записей вместо p готовое выражение re.
      var re;
      if (e.re) {
        if (!regexCache['re::' + e.re]) regexCache['re::' + e.re] = new RegExp(e.re, 'giu');
        re = regexCache['re::' + e.re];
        re.lastIndex = 0;
      } else re = cachedRegex(kind + '::' + e.p, e.p, 2);
      var m;
      while ((m = re.exec(lowerText)) !== null) {
        hits.push({
          start: m.index, end: m.index + m[0].length,
          match: m[0], phrase: e.p, w: e.w || 1,
          cat: e.cat || kind, repl: e.repl || [], note: e.note || ''
        });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
    // сортировка + удаление перекрытий (оставляем более весомую/длинную)
    hits.sort(function (a, b) { return a.start - b.start || b.w - a.w || (b.end - b.start) - (a.end - a.start); });
    var res = [];
    for (var j = 0; j < hits.length; j++) {
      var h = hits[j];
      var prev = res[res.length - 1];
      if (prev && h.start < prev.end) {
        if ((h.w > prev.w) || (h.w === prev.w && (h.end - h.start) > (prev.end - prev.start))) res[res.length - 1] = h;
        continue;
      }
      res.push(h);
    }
    return res;
  }

  /* ---------------- анализ строк / структуры ---------------- */

  var MARKETING_EMOJI = '✅🔹🔸👉📌🚀💡⚡🔥✨❗❕✔☑🎯📊📈🧩🛠💪🤝';

  function analyzeLines(text) {
    var lines = text.split('\n');
    var st = { total: 0, bullets: 0, headers: 0, colonHeaders: 0, bold: 0, emoji: 0 };
    st.bold = (text.match(/\*\*[^*\n]{2,80}\*\*/g) || []).length;
    st.emoji = (text.match(new RegExp('[' + MARKETING_EMOJI + ']', 'gu')) || []).length;
    var emojiStart = new RegExp('^[' + MARKETING_EMOJI + ']', 'u');
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (!ln) continue;
      st.total++;
      if (/^([-–—•*▪●○]|\d{1,2}[.)])\s+/.test(ln) || emojiStart.test(ln)) { st.bullets++; continue; }
      if (/^#{1,6}\s/.test(ln)) { st.headers++; continue; }
      if (/^[^.!?…]{3,70}:\s*$/.test(ln)) { st.colonHeaders++; continue; }
      if (ln.length < 64 && countWords(ln) <= 9 && !/[.!?…,:;]$/.test(ln)) st.headers++;
    }
    return st;
  }

  /* ---------------- профили ---------------- */

  var PROFILES = {
    strict:   { mult: 1.14, shift: 3,  seg: [66, 50, 33], name: 'Строгий' },
    balanced: { mult: 1.0,  shift: 0,  seg: [72, 55, 38], name: 'Сбалансированный' },
    soft:     { mult: 0.87, shift: -3, seg: [78, 61, 43], name: 'Мягкий' }
  };

  /* -------- посентенс-модуль (js/sentences.js) -------- */
  function getSentencesModule() {
    if (typeof Sentences !== 'undefined' && Sentences && Sentences.analyze) return Sentences;
    if (typeof self !== 'undefined' && self.Sentences) return self.Sentences;
    if (typeof require === 'function') {
      try { return require('./sentences.js'); } catch (e) { /* нет — работаем без него */ }
    }
    return null;
  }

  /* ---------------- калибровка шкалы ----------------
   * Проблема, которую это чинит: восемь метрик из девяти на живом
   * профессиональном тексте дают почти одно и то же значение. Их сумма —
   * постоянный фон ~21 балл, из-за которого начисто вычищенный текст
   * показывал 24-30 вместо честного нуля, а разница между текстами тонула.
   *
   * NEUTRAL — медиана метрики на эталонном корпусе из 13 готовых кейсов и
   * статей «Доминиона» (тексты, прошедшие внешние детекторы с большим
   * запасом: ZeroGPT 0-3.9%). Это и есть «нормально написанный деловой
   * текст». Сигнал, равный опорному, даёт NEUTRAL_OUT баллов, а не свои
   * сырые 63.
   *
   * Сырой signal никуда не девается: он остаётся в отчёте и в объяснениях,
   * меняется только вклад в итог и цвет метрики.
   */
  var NEUTRAL = { cliches: 2, rhythm: 25, starters: 17, bureaucratic: 20,
    structure: 19, paragraphs: 4, punctuation: 32, lexical: 19, specificity: 63 };
  var NEUTRAL_OUT = 10;

  function calibrate(signal, key) {
    var n = NEUTRAL[key];
    if (n === undefined) return signal;
    if (signal <= n) return n ? (signal / n) * NEUTRAL_OUT : NEUTRAL_OUT;
    return NEUTRAL_OUT + (signal - n) / (100 - n) * (100 - NEUTRAL_OUT);
  }

  /* ---------------- метрики ---------------- */

  // Каждая метрика возвращает { signal: 0..100 (больше = более ИИ), reliability: 0..1, value, detail }

  function metricCliches(hits, words) {
    var sumW = 0;
    for (var i = 0; i < hits.length; i++) sumW += hits[i].w;
    var per1000 = words ? (sumW / words) * 1000 : 0;
    return {
      signal: scale(per1000, [[0, 2], [4, 18], [9, 40], [16, 62], [28, 82], [45, 95], [70, 100]]),
      reliability: clamp(words / 150, 0.3, 1),
      value: Math.round(per1000 * 10) / 10,
      detail: hits.length + ' совпадений, взвешенная плотность ' + (Math.round(per1000 * 10) / 10) + ' на 1000 слов'
    };
  }

  function metricRhythm(sentences) {
    var lens = [];
    for (var i = 0; i < sentences.length; i++) {
      var wc = countWords(sentences[i].text);
      if (wc >= 3) lens.push(wc); // пункты списков/заголовки не считаем
    }
    if (lens.length < 5) return { signal: 50, reliability: 0.15, value: 0, detail: 'Слишком мало предложений для оценки ритма' };
    var globalCv = cv(lens);
    // локальная равномерность: средний |разница соседних| / средняя длина
    var diffs = [];
    for (var j = 1; j < lens.length; j++) diffs.push(Math.abs(lens[j] - lens[j - 1]));
    var localVar = mean(diffs) / (mean(lens) || 1);
    var sGlobal = scale(globalCv, [[0.18, 95], [0.28, 78], [0.38, 55], [0.48, 32], [0.58, 16], [0.72, 5]]);
    var sLocal = scale(localVar, [[0.15, 92], [0.3, 70], [0.45, 45], [0.6, 25], [0.8, 8]]);
    return {
      signal: Math.round(sGlobal * 0.6 + sLocal * 0.4),
      reliability: clamp(lens.length / 15, 0.3, 1),
      value: Math.round(globalCv * 100) / 100,
      detail: 'Вариативность длины предложений (CV): ' + (Math.round(globalCv * 100) / 100) +
        '. Средняя длина ' + Math.round(mean(lens)) + ' слов. У живого текста CV обычно 0.45–0.75.'
    };
  }

  function metricStarters(sentences, starters) {
    var eligible = 0, hitCount = 0, firstWords = {}, repeats = 0;
    for (var i = 0; i < sentences.length; i++) {
      var t = sentences[i].text.toLowerCase().replace(/^["«\-–—\d.)\s#*]+/, '');
      if (countWords(t) < 3) continue;
      eligible++;
      for (var j = 0; j < starters.length; j++) {
        var st = starters[j];
        if (t.indexOf(st) === 0) { hitCount++; break; }
      }
      var fw = (t.match(/^[а-яёa-z]+/) || [''])[0];
      if (fw) { firstWords[fw] = (firstWords[fw] || 0) + 1; }
    }
    for (var k in firstWords) { if (firstWords[k] >= 3) repeats += firstWords[k] - 2; }
    if (!eligible) return { signal: 40, reliability: 0.1, value: 0, detail: 'Нет предложений для оценки' };
    var share = hitCount / eligible + (repeats / eligible) * 0.5;
    return {
      signal: scale(share, [[0, 4], [0.06, 18], [0.12, 38], [0.2, 60], [0.3, 80], [0.45, 95]]),
      reliability: clamp(eligible / 10, 0.3, 1),
      value: Math.round(share * 100),
      detail: hitCount + ' из ' + eligible + ' предложений начинаются с шаблонной связки («таким образом», «кроме того»…)'
    };
  }

  function metricBureaucratic(lowerText, words, burList, lang) {
    if (lang !== 'ru') {
      // для английского считаем только из списка en
    }
    var count = 0, found = {};
    for (var i = 0; i < burList.length; i++) {
      var re = cachedRegex('bur::' + burList[i], burList[i], 1);
      var m;
      while ((m = re.exec(lowerText)) !== null) {
        count++; found[burList[i]] = (found[burList[i]] || 0) + 1;
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
    // номинализации: -ение/-ание/-ация/-ость/-ство
    var nom = (lowerText.match(/[а-яё]{3,}(ени[еия]|ани[еия]|аци[еия]|яци[еия]|ост[ьи]|ств[оае])(?![а-яё])/g) || []).length;
    var per100 = words ? ((count * 1.6 + nom * 0.55) / words) * 100 : 0;
    var top = Object.keys(found).sort(function (a, b) { return found[b] - found[a]; }).slice(0, 6);
    return {
      signal: scale(per100, [[0.5, 5], [2, 22], [4, 42], [7, 62], [11, 80], [16, 93]]),
      reliability: clamp(words / 150, 0.3, 1) * (lang === 'ru' ? 1 : 0.7),
      value: Math.round(per100 * 10) / 10,
      detail: 'Плотность канцелярита и отглагольных существительных: ' + (Math.round(per100 * 10) / 10) +
        ' на 100 слов' + (top.length ? '. Частые: ' + top.join(', ') : ''),
      found: top
    };
  }

  function metricStructure(lineStats, chars, markdownAware) {
    if (lineStats.total < 3) return { signal: 30, reliability: 0.2, value: 0, detail: 'Мало строк для оценки структуры' };
    var bulletShare = lineStats.bullets / lineStats.total;
    var headerShare = (lineStats.headers + lineStats.colonHeaders) / lineStats.total;
    var boldPer1000 = (lineStats.bold / Math.max(chars, 1)) * 1000 * 100; // на 100k симв. → нормируем ниже
    var s = scale(bulletShare, [[0, 5], [0.15, 25], [0.3, 50], [0.45, 72], [0.6, 88]]);
    s += scale(headerShare, [[0, 0], [0.1, 8], [0.25, 18], [0.4, 26]]);
    s += Math.min(18, lineStats.bold * 2.2);
    s += Math.min(14, lineStats.emoji * 2.5);
    s = clamp(Math.round(s), 0, 100);
    var capped = markdownAware ? Math.min(s, 38) : s;
    return {
      signal: capped,
      reliability: clamp(lineStats.total / 8, 0.3, 1) * 0.9,
      value: Math.round(bulletShare * 100),
      detail: 'Списки: ' + lineStats.bullets + ' строк, заголовки: ' + (lineStats.headers + lineStats.colonHeaders) +
        ', жирные выделения **…**: ' + lineStats.bold + ', «маркетинговые» эмодзи: ' + lineStats.emoji +
        (markdownAware ? '. Режим «структура задумана» — вклад ограничен.' : '')
    };
  }

  function metricParagraphs(text) {
    var paras = text.split(/\n\s*\n|\n(?=[-–—•*#\d])/).map(function (p) { return p.trim(); }).filter(function (p) { return countWords(p) >= 8; });
    if (paras.length < 4) return { signal: 40, reliability: 0.15, value: 0, detail: 'Мало абзацев для оценки' };
    var lens = paras.map(countWords);
    var c = cv(lens);
    return {
      signal: scale(c, [[0.1, 88], [0.2, 70], [0.3, 50], [0.45, 28], [0.6, 12], [0.8, 4]]),
      reliability: clamp(paras.length / 8, 0.3, 1),
      value: Math.round(c * 100) / 100,
      detail: paras.length + ' абзацев, вариативность объёма (CV): ' + (Math.round(c * 100) / 100) +
        '. Одинаковые по размеру абзацы — типичный почерк генерации.'
    };
  }

  function metricPunctuation(text, chars, sentences) {
    var dashes = (text.match(/\s[—–]\s/g) || []).length;
    var colons = (text.match(/:/g) || []).length;
    var semis = (text.match(/;/g) || []).length;
    var questions = (text.match(/\?/g) || []).length;
    var exclaims = (text.match(/!/g) || []).length;
    var parens = (text.match(/\(/g) || []).length;
    var ellips = (text.match(/…|\.\.\./g) || []).length;
    var per1000 = function (n) { return chars ? (n / chars) * 1000 : 0; };
    var aiSide = scale(per1000(dashes) + per1000(colons) * 0.7 + per1000(semis) * 0.5,
      [[0.5, 10], [2, 30], [4, 55], [6.5, 75], [10, 90]]);
    var humanSide = (questions ? 14 : 0) + (parens ? 12 : 0) + (ellips ? 10 : 0) + (exclaims ? 8 : 0);
    var signal = clamp(Math.round(aiSide - humanSide * 0.7 + (questions + parens + ellips === 0 && chars > 2500 ? 18 : 0)), 0, 100);
    return {
      signal: signal,
      reliability: clamp(chars / 2500, 0.3, 1) * 0.85,
      value: Math.round(per1000(dashes + colons) * 10) / 10,
      detail: 'Тире: ' + dashes + ', двоеточий: ' + colons + ', вопросов: ' + questions +
        ', скобок: ' + parens + ', многоточий: ' + ellips +
        '. ИИ-текст «ровный»: много тире и двоеточий, нет вопросов и скобок-ремарок.'
    };
  }

  var STOP_RU = 'и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех никогда можно при наконец два об другой хоть после над больше тот через эти нас про всего них какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя такой им более всегда конечно всю между это'.split(' ');

  function metricLexical(lowerText) {
    var tokens = lowerText.match(/[а-яёa-z][а-яёa-z\-]{3,}/g) || [];
    var content = [];
    for (var i = 0; i < tokens.length; i++) {
      if (STOP_RU.indexOf(tokens[i]) === -1) content.push(tokens[i]);
    }
    if (content.length < 120) return { signal: 45, reliability: 0.15, value: 0, detail: 'Мало слов для лексической оценки' };
    // грубая лемма: первые 6 букв
    var stems = {}, uniq = 0;
    for (var j = 0; j < content.length; j++) {
      var st = content[j].slice(0, 6);
      if (!stems[st]) { stems[st] = 0; uniq++; }
      stems[st]++;
    }
    var ratio = uniq / content.length;
    return {
      signal: scale(ratio, [[0.4, 10], [0.52, 22], [0.62, 40], [0.72, 60], [0.82, 78], [0.9, 88]]),
      reliability: clamp(content.length / 400, 0.3, 1) * 0.8,
      value: Math.round(ratio * 100) / 100,
      detail: 'Доля уникальных основ: ' + Math.round(ratio * 100) +
        '%. Люди естественно повторяют ключевые слова; ИИ склонен к «элегантному разнообразию» синонимов.'
    };
  }

  function metricSpecificity(text, lowerText, words, humanHits) {
    var firstPerson = (lowerText.match(/(^|[^а-яё])(я|мне|меня|мной|мой|моя|мои|моего|по-моему)(?![а-яё])/g) || []).length;
    var wePersonal = (lowerText.match(/(у нас|мы у себя|наш опыт|на нашем|в нашей практике|мы попробовали|мы столкнулись)/g) || []).length;
    var years = (text.match(/(^|[^\d])(19|20)\d{2}(?!\d)/g) || []).length;
    var numbersUnits = (text.match(/\d[\d\s.,]*\s?(₽|руб|%|км|кг|мм|см|м²|гб|мб|шт|час|минут|лет|раз|дн)(?![а-яёa-z])/gi) || []).length;
    var urls = (text.match(/https?:\/\/|www\./gi) || []).length;
    var quotes = (text.match(/«[^»]{10,240}»/g) || []).length;
    var digits = (text.match(/\d/g) || []).length;
    var markerScore = humanHits.length;
    var per1000 = function (n) { return words ? (n / words) * 1000 : 0; };
    var score =
      scale(per1000(firstPerson), [[0, 0], [2, 12], [6, 24], [14, 34]]) +
      scale(per1000(markerScore), [[0, 0], [2, 12], [6, 26], [14, 38]]) +
      scale(per1000(numbersUnits + years), [[0, 0], [1.5, 8], [5, 18], [12, 26]]) +
      (wePersonal ? 8 : 0) + (urls ? 4 : 0) + (quotes ? 6 : 0) +
      scale(per1000(digits), [[0, 0], [4, 4], [15, 10], [40, 14]]);
    var humanScore = clamp(Math.round(score), 0, 100);
    return {
      signal: 100 - humanScore,
      reliability: clamp(words / 150, 0.3, 1),
      value: humanScore,
      detail: 'Личные формы: ' + (firstPerson + wePersonal) + ', разговорные маркеры: ' + markerScore +
        ', числа с единицами: ' + numbersUnits + ', годы: ' + years + ', цитаты: ' + quotes +
        '. Конкретика и личный опыт — сильнейший «человеческий» сигнал (и E-E-A-T для SEO).',
      humanScore: humanScore
    };
  }

  /* ---------------- сегментация ---------------- */

  function makeSegments(text, segmentSize) {
    var paras = [];
    var re = /[^\n]+(\n|$)/g, m;
    while ((m = re.exec(text)) !== null) {
      if (m[0].trim()) paras.push({ text: m[0], start: m.index, end: m.index + m[0].length });
    }
    var segments = [], cur = null;
    for (var i = 0; i < paras.length; i++) {
      if (!cur) { cur = { start: paras[i].start, end: paras[i].end }; }
      else { cur.end = paras[i].end; }
      if (cur.end - cur.start >= segmentSize) { segments.push(cur); cur = null; }
    }
    if (cur) {
      // маленький хвост приклеиваем к предыдущему сегменту
      if (segments.length && (cur.end - cur.start) < segmentSize * 0.4) {
        segments[segments.length - 1].end = cur.end;
      } else segments.push(cur);
    }
    return segments.map(function (s, idx) {
      return { id: idx + 1, start: s.start, end: s.end, text: text.slice(s.start, s.end) };
    });
  }

  /* ---------------- основной анализ ---------------- */

  function analyze(text, kb, options) {
    options = options || {};
    var profile = PROFILES[options.profile] || PROFILES.balanced;
    var segmentSize = options.segmentSize || 900;
    var whitelist = (options.whitelist || []).map(function (s) { return String(s).toLowerCase().trim(); });
    var markdownAware = !!options.markdownAware;

    text = String(text || '').replace(/\r\n?/g, '\n');
    var lowerText = text.toLowerCase();
    var chars = text.length;
    var words = countWords(text);
    var lang = (options.lang && options.lang !== 'auto') ? options.lang : detectLang(text);

    var sentences = splitSentences(text);
    var lineStats = analyzeLines(text);

    var phraseList = (kb.phrases && kb.phrases[lang]) || [];
    var otherList = lang === 'ru' ? (kb.phrases.en || []) : (kb.phrases.ru || []);
    var hits = findPhraseHits(lowerText, phraseList, whitelist, 'p')
      .concat(findPhraseHits(lowerText, otherList, whitelist, 'p2'));
    hits.sort(function (a, b) { return a.start - b.start; });

    var humanEntries = ((kb.humanMarkers && kb.humanMarkers[lang]) || []).map(function (p) {
      return { p: p, w: 1, cat: 'human', repl: [], note: 'Живой разговорный маркер' };
    });
    var humanHits = findPhraseHits(lowerText, humanEntries, [], 'h');

    var starters = (kb.starters && kb.starters[lang]) || [];
    var burList = (kb.bureaucratic && kb.bureaucratic[lang]) || [];

    // канцелярит с офсетами — для подсветки в тексте
    var burEntries = burList.map(function (p) {
      return { p: p, w: 1, cat: 'bureaucratic', repl: [], note: 'Канцелярит — замените активным глаголом' };
    });
    var burHits = findPhraseHits(lowerText, burEntries, whitelist, 'burh');

    // шаблонные начала предложений с офсетами — для подсветки
    var startersByLen = starters.slice().sort(function (a, b) { return b.length - a.length; });
    var starterHits = [];
    sentences.forEach(function (s) {
      if (countWords(s.text) < 3) return;
      var raw = text.slice(s.start, s.end);
      var lead = (raw.match(/^[\s"«\-–—\d.)#*]*/) || [''])[0].length;
      var t = raw.slice(lead).toLowerCase();
      for (var i = 0; i < startersByLen.length; i++) {
        var st = startersByLen[i];
        if (t.indexOf(st) === 0 && !/[а-яёa-z]/.test(t.charAt(st.length))) {
          starterHits.push({ start: s.start + lead, end: s.start + lead + st.length, phrase: st, match: raw.slice(lead, lead + st.length) });
          break;
        }
      }
    });

    /* --- метрики --- */
    var mCliche = metricCliches(hits, words);
    var mRhythm = metricRhythm(sentences);
    var mStart = metricStarters(sentences, starters);
    var mBur = metricBureaucratic(lowerText, words, burList, lang);
    var mStruct = metricStructure(lineStats, chars, markdownAware);
    var mPara = metricParagraphs(text);
    var mPunct = metricPunctuation(text, chars, sentences);
    var mLex = metricLexical(lowerText);
    var mSpec = metricSpecificity(text, lowerText, words, humanHits);

    var METRICS = [
      { key: 'cliches',    title: 'Штампы и клише ИИ',        w: 0.24, m: mCliche,
        explain: 'Совпадения с базой типичных фраз нейросетей и SEO-копирайтинга. Самый показательный сигнал.' },
      { key: 'rhythm',     title: 'Ритм предложений',          w: 0.15, m: mRhythm,
        explain: 'ИИ пишет предложениями почти одинаковой длины. Живой текст «дышит»: короткое — длинное — среднее.' },
      { key: 'starters',   title: 'Шаблонные начала',          w: 0.10, m: mStart,
        explain: 'Доля предложений, начинающихся со связок «таким образом», «кроме того», «более того» и т.п.' },
      { key: 'bureaucratic', title: 'Канцелярит и пассив',     w: 0.11, m: mBur,
        explain: '«Является», «осуществляется», отглагольные существительные — стиль, который ИИ обожает.' },
      { key: 'structure',  title: 'Структурные шаблоны',       w: 0.07, m: mStruct,
        explain: 'Списки-простыни, заголовки с двоеточием, жирные выделения, эмодзи-маркеры — почерк генерации.' },
      { key: 'paragraphs', title: 'Однородность абзацев',      w: 0.06, m: mPara,
        explain: 'Абзацы-«кирпичики» одинакового размера — признак генерации по плану.' },
      { key: 'punctuation', title: 'Пунктуационный профиль',   w: 0.07, m: mPunct,
        explain: 'Много тире и двоеточий, ноль вопросов, скобок и многоточий — «ровная» машинная пунктуация.' },
      { key: 'lexical',    title: 'Лексическое разнообразие',  w: 0.08, m: mLex,
        explain: 'Неестественно высокое разнообразие синонимов без повторов — «элегантная вариативность» ИИ.' },
      { key: 'specificity', title: 'Конкретика и опыт',        w: 0.12, m: mSpec,
        explain: 'Личный опыт, цифры, даты, цитаты, разговорные обороты. Чем их меньше — тем «мертвее» текст.' }
    ];

    var calibrated = options.calibrated === false ? false : true;
    var wSum = 0, sSum = 0, signals = [];
    METRICS.forEach(function (M) {
      var we = M.w * M.m.reliability;
      M.rel = calibrated ? calibrate(M.m.signal, M.key) : M.m.signal;
      wSum += we; sSum += M.rel * we;
      signals.push(M.rel);
    });
    var raw = wSum ? sSum / wSum : 50;
    var aiScore = clamp(Math.round(raw * profile.mult + profile.shift), 0, 100);

    /* --- вердикт и уверенность --- */
    var verdict, verdictKey;
    if (aiScore >= 80) { verdict = 'Почти наверняка сгенерирован ИИ'; verdictKey = 'ai'; }
    else if (aiScore >= 60) { verdict = 'Вероятно, написан ИИ'; verdictKey = 'likely_ai'; }
    else if (aiScore >= 40) { verdict = 'Смешанный: похоже на ИИ с редактурой (или сухой человеческий стиль)'; verdictKey = 'mixed'; }
    else if (aiScore >= 20) { verdict = 'Скорее всего, написан человеком'; verdictKey = 'likely_human'; }
    else { verdict = 'Текст выглядит написанным человеком'; verdictKey = 'human'; }

    var confidence = words < 120 ? 'низкая' : (words < 400 ? 'средняя' : 'высокая');
    var disagreement = stdev(signals);
    if (disagreement > 33 && confidence === 'высокая') confidence = 'средняя';
    var confidenceNote = words < 120
      ? 'Текст короткий (' + words + ' слов) — любому детектору нужно 150+ слов для надёжной оценки.'
      : (disagreement > 33 ? 'Метрики расходятся между собой: часть текста может быть отредактирована.' : 'Объём текста достаточен для устойчивой оценки.');

    /* --- сегменты --- */
    var segs = makeSegments(text, segmentSize);
    var segments = segs.map(function (sg) {
      var sLower = sg.text.toLowerCase();
      var sWords = countWords(sg.text);
      var sSent = splitSentences(sg.text);
      var sHits = hits.filter(function (h) { return h.start >= sg.start && h.end <= sg.end; });
      var sHuman = humanHits.filter(function (h) { return h.start >= sg.start && h.end <= sg.end; });
      var c1 = metricCliches(sHits, sWords);
      var c2 = metricRhythm(sSent);
      var c3 = metricStarters(sSent, starters);
      var c4 = metricBureaucratic(sLower, sWords, burList, lang);
      var c5 = metricSpecificity(sg.text, sLower, sWords, sHuman);
      var parts = [
        { m: c1, w: 0.32, k: 'cliches' }, { m: c2, w: 0.16, k: 'rhythm' },
        { m: c3, w: 0.14, k: 'starters' }, { m: c4, w: 0.16, k: 'bureaucratic' },
        { m: c5, w: 0.22, k: 'specificity' }
      ];
      var ws = 0, ss = 0;
      parts.forEach(function (p) {
        var we = p.w * p.m.reliability;
        ws += we; ss += (calibrated ? calibrate(p.m.signal, p.k) : p.m.signal) * we;
      });
      var score = clamp(Math.round((ws ? ss / ws : 50) * profile.mult + profile.shift), 0, 100);
      var label = score >= profile.seg[0] ? 'AI' : score >= profile.seg[1] ? 'LIKELY_AI' : score >= profile.seg[2] ? 'LIKELY_HUMAN' : 'HUMAN';
      var reasons = [];
      if (c1.signal >= 45 && sHits.length) reasons.push('Штампы: ' + sHits.slice(0, 4).map(function (h) { return '«' + h.match + '»'; }).join(', '));
      if (c2.signal >= 55 && c2.reliability > 0.2) reasons.push('Монотонный ритм предложений (CV ' + c2.value + ')');
      if (c3.signal >= 50) reasons.push('Шаблонные начала предложений');
      if (c4.signal >= 55) reasons.push('Канцелярит' + (c4.found && c4.found.length ? ': ' + c4.found.slice(0, 3).join(', ') : ''));
      if (c5.humanScore >= 40) reasons.push('Есть конкретика/личные маркеры — человеческий сигнал');
      if (!reasons.length) reasons.push(label === 'HUMAN' || label === 'LIKELY_HUMAN' ? 'Выраженных ИИ-признаков не найдено' : 'Совокупность слабых сигналов');
      return {
        id: sg.id, start: sg.start, end: sg.end, text: sg.text,
        chars: sg.text.length, score: score, label: label, reasons: reasons,
        hits: sHits.map(function (h) { return { phrase: h.match, cat: h.cat, w: h.w }; })
      };
    });

    var dist = { AI: 0, LIKELY_AI: 0, LIKELY_HUMAN: 0, HUMAN: 0 };
    segments.forEach(function (s) { dist[s.label]++; });

    /* --- разбор по предложениям ---
     * Раньше здесь был балл сегмента, размазанный по его предложениям: без
     * словарного совпадения все предложения получали одно и то же число, и
     * карта ничего не показывала. Теперь у каждого предложения свои признаки
     * и свой список причин — см. js/sentences.js.
     */
    var SentMod = getSentencesModule();
    var heat;
    if (SentMod) {
      heat = SentMod.analyze(text, sentences, {
        hits: hits, burHits: burHits, starterHits: starterHits
      });
    } else {
      // запасной путь, если sentences.js не подключён
      heat = sentences.filter(function (s) { return countWords(s.text) >= 2; }).map(function (s) {
        return { start: s.start, end: s.end, score: 0, level: 'HUMAN', reasons: [],
                 preview: s.text.slice(0, 160) };
      });
    }

    /* --- рекомендации и сильные стороны --- */
    var recommendations = [];
    var strengths = [];
    function rec(priority, title, detail) { recommendations.push({ priority: priority, title: title, detail: detail }); }

    if (mCliche.signal >= 35) {
      var topHits = {};
      hits.forEach(function (h) { var k = '«' + h.match + '»'; topHits[k] = (topHits[k] || 0) + 1; });
      var listed = Object.keys(topHits).slice(0, 8).join(', ');
      rec(mCliche.signal >= 60 ? 'high' : 'medium', 'Убрать штампы ИИ',
        'Найдено ' + hits.length + ' совпадений с базой клише: ' + listed +
        '. Каждое либо удалите, либо замените конкретным фактом.');
    } else if (hits.length === 0) strengths.push('Штампов ИИ из базы не найдено — отлично.');
    else strengths.push('Штампов мало (' + hits.length + ') — хороший результат.');

    if (mRhythm.signal >= 45 && mRhythm.reliability > 0.2) {
      rec(mRhythm.signal >= 65 ? 'high' : 'medium', 'Разбить монотонный ритм',
        'Предложения слишком одинаковые по длине (CV ' + mRhythm.value + '). Добавьте короткие предложения-акценты (3–5 слов). И пару длинных, со вставными конструкциями — как в живой речи. Целевой CV — выше 0.5.');
    } else if (mRhythm.reliability > 0.2 && mRhythm.signal < 30) strengths.push('Хороший живой ритм предложений (CV ' + mRhythm.value + ').');

    if (mStart.signal >= 45) {
      rec('medium', 'Переписать начала предложений',
        mStart.detail + '. Начинайте с сути: с существительного, глагола, цифры или вопроса — а не со связки.');
    }
    if (mBur.signal >= 45) {
      rec(mBur.signal >= 65 ? 'high' : 'medium', 'Заменить канцелярит активными глаголами',
        mBur.detail + '. «Осуществляется доставка» → «доставляем». «Является лидером» → «лидирует».');
    } else if (mBur.reliability > 0.3 && mBur.signal < 25) strengths.push('Канцелярита почти нет — текст звучит по-человечески.');

    if (mStruct.signal >= 50) {
      rec('medium', 'Ослабить «генеративную» структуру',
        mStruct.detail + '. Часть списков переведите в связный текст, уберите эмодзи-маркеры и лишние жирные выделения.');
    }
    if (mPara.signal >= 55 && mPara.reliability > 0.2) {
      rec('low', 'Разнообразить размер абзацев',
        mPara.detail + ' Сделайте один абзац из одного предложения — это сразу оживляет полосу текста.');
    }
    if (mPunct.signal >= 50) {
      rec('low', 'Оживить пунктуацию',
        mPunct.detail + ' Добавьте риторический вопрос, ремарку в скобках или многоточие там, где это естественно.');
    }
    if (mLex.signal >= 55 && mLex.reliability > 0.2) {
      rec('low', 'Не бояться повторов ключевых слов',
        mLex.detail + ' Для SEO повтор ключевого запроса в естественных формах — это плюс, а не минус.');
    }
    if (mSpec.humanScore < 35) {
      rec(mSpec.humanScore < 18 ? 'high' : 'medium', 'Добавить конкретику и личный опыт',
        'Самый мощный способ «очеловечить» текст и усилить E-E-A-T: реальные цифры, даты, названия, «мы столкнулись с…», «в нашем случае…», мини-кейс, цитата клиента. Сейчас индекс конкретики всего ' + mSpec.humanScore + '/100.');
    } else if (mSpec.humanScore >= 50) strengths.push('Много конкретики и личных маркеров (индекс ' + mSpec.humanScore + '/100) — сильный человеческий сигнал и плюс для E-E-A-T.');

    var prioOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort(function (a, b) { return prioOrder[a.priority] - prioOrder[b.priority]; });

    return {
      meta: {
        chars: chars, words: words, sentences: sentences.length,
        lang: lang, profile: options.profile || 'balanced', profileName: profile.name,
        segmentSize: segmentSize, markdownAware: markdownAware,
        engine: (typeof self !== 'undefined' && self.DetectorVersion) ? self.DetectorVersion.full : 'ИИ Детектор Пылова', deterministic: true, calibrated: calibrated
      },
      overall: { aiScore: aiScore, humanScore: 100 - aiScore, verdict: verdict, verdictKey: verdictKey, confidence: confidence, confidenceNote: confidenceNote },
      metrics: METRICS.map(function (M) {
        var st = M.rel >= 55 ? 'bad' : M.rel >= 35 ? 'warn' : 'good';
        return { key: M.key, title: M.title, weight: M.w, signal: Math.round(M.m.signal),
          relative: Math.round(M.rel), neutral: NEUTRAL[M.key],
          reliability: Math.round(M.m.reliability * 100) / 100, status: st, value: M.m.value, detail: M.m.detail, explain: M.explain };
      }),
      segments: segments,
      distribution: dist,
      hits: hits,
      humanHits: humanHits,
      burHits: burHits,
      starterHits: starterHits,
      heat: heat,
      recommendations: recommendations,
      strengths: strengths
    };
  }

  return {
    analyze: analyze,
    splitSentences: splitSentences,
    countWords: countWords,
    detectLang: detectLang,
    PROFILES: PROFILES
  };
});


  })(ns, undefined, ns, ns, undefined, undefined);

/* Обёртка сборки: то, ради чего всё склеивается в один файл.
   Внутри доступны ns.JSZip, ns.AIDetectorKB, ns.AIDetector, ns.Sentences. */

var JSZip = ns.JSZip, KB = ns.AIDetectorKB, DET = ns.AIDetector;

// Служебные строки документов «Доминиона» — их в проверку не берём
var SERVICE_RE = /^(alt:|Дизайнеру:|Анкор|Ссылка|Схема-пример|Запасные|Title|Description|URL|Лид —|Цветовая легенда|Перед прогоном|надзаголовок:|—\s)/i;

function unescapeXml(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

/* Достаёт из document.xml только публикуемый текст.
   Абзац, все прогоны которого набраны курсивом, считается служебным —
   так размечены надзаголовки, alt, пометки дизайнеру и анкоры. */
function textFromDocumentXml(xml) {
  var paras = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  var out = [];
  for (var i = 0; i < paras.length; i++) {
    var runs = paras[i].match(/<w:r[ >][\s\S]*?<\/w:r>/g) || [];
    var text = '', total = 0, italic = 0;
    for (var j = 0; j < runs.length; j++) {
      var t = (runs[j].match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [])
        .map(function (x) { return x.replace(/<[^>]+>/g, ''); }).join('');
      if (!t.trim()) continue;
      text += t; total++;
      if (/<w:i\/>|<w:i\s/.test(runs[j])) italic++;
    }
    text = unescapeXml(text).trim();
    if (!text) continue;
    if (total && italic === total) continue;
    if (SERVICE_RE.test(text)) continue;
    out.push(text);
  }
  return out.join('\n\n');
}

function extractDocx(data) {
  return JSZip.loadAsync(data)
    .then(function (zip) {
      var f = zip.file('word/document.xml');
      if (!f) throw new Error('это не .docx: внутри нет word/document.xml');
      return f.async('string');
    })
    .then(textFromDocumentXml);
}

function pad(s, n) { s = String(s); return s.length >= n ? s : s + new Array(n - s.length + 1).join(' '); }
function lpad(s, n) { s = String(s); return s.length >= n ? s : new Array(n - s.length + 1).join(' ') + s; }

function summary(r, title) {
  var L = [];
  L.push('');
  if (title) L.push('Файл: ' + title);
  L.push('Слов в публикуемом тексте: ' + r.meta.words + '   профиль: ' + r.meta.profileName);
  L.push('');
  L.push('AI-сигнал: ' + r.overall.aiScore + '/100 — ' + r.overall.verdict);
  L.push('Уверенность: ' + r.overall.confidence);
  L.push('');
  L.push('МЕТРИКИ  (сырой сигнал → относительно нормы делового текста)');
  r.metrics.forEach(function (m) {
    var mark = m.status === 'bad' ? '✗' : m.status === 'warn' ? '~' : '✓';
    var rel = m.relative === undefined ? m.signal : m.relative;
    L.push('  ' + mark + ' ' + lpad(m.signal, 3) + ' → ' + lpad(rel, 3) + '  ' + m.title +
      (m.neutral === undefined ? '' : '   норма ~' + m.neutral));
  });

  var flagged = (r.heat || []).filter(function (h) { return h.level === 'AI' || h.level === 'LIKELY_AI'; });
  L.push('');
  if (flagged.length) {
    L.push('ПРЕДЛОЖЕНИЯ, КОТОРЫЕ НАДО ПЕРЕПИСАТЬ (' + flagged.length + ')');
    flagged.sort(function (a, b) { return b.score - a.score; }).slice(0, 30).forEach(function (h, i) {
      var why = h.reasons.filter(function (x) { return !x.editorial && x.code !== 'ok'; })
        .map(function (x) { return x.title.toLowerCase(); });
      L.push('  ' + lpad(i + 1, 2) + '. [' + lpad(h.score, 2) + '/100] ' + h.preview.replace(/\s+/g, ' ').slice(0, 96));
      L.push('      ' + why.join(', '));
    });
  } else {
    L.push('ПРЕДЛОЖЕНИЯ: машинных предложений не найдено.');
  }

  var notes = (r.heat || []).filter(function (h) {
    return (h.reasons || []).some(function (x) { return x.editorial; });
  });
  if (notes.length) {
    L.push('');
    L.push('ЗАМЕТКИ РЕДАКТОРУ (' + notes.length + ') — на ИИ не указывают');
    notes.slice(0, 10).forEach(function (h) {
      var t = h.reasons.filter(function (x) { return x.editorial; })
        .map(function (x) { return x.title.toLowerCase(); }).join(', ');
      L.push('  • ' + t + ': ' + h.preview.replace(/\s+/g, ' ').slice(0, 88));
    });
  }

  L.push('');
  L.push('СЕГМЕНТЫ: ' + Object.keys(r.distribution).map(function (k) {
    return k + ' ' + r.distribution[k];
  }).join(', '));

  if (r.hits.length) {
    var uniq = {};
    r.hits.forEach(function (h) { uniq['«' + h.match + '»'] = 1; });
    L.push('ШТАМПЫ (' + r.hits.length + '): ' + Object.keys(uniq).slice(0, 20).join(', '));
  } else {
    L.push('ШТАМПЫ: не найдено.');
  }

  if (r.recommendations.length) {
    L.push('');
    L.push('ЧТО ИСПРАВИТЬ');
    r.recommendations.forEach(function (x, i) { L.push('  ' + (i + 1) + '. ' + x.title + ': ' + x.detail); });
  }
  L.push('');
  return L.join('\n');
}

function checkText(text, profile, opts) {
  opts = opts || {};
  var r = DET.analyze(text, KB, {
    profile: profile || 'strict',
    lang: opts.lang || 'ru',
    markdownAware: !!opts.markdownAware,
    whitelist: opts.whitelist || []
  });
  return { report: r, summary: summary(r, opts.title), text: text };
}

function checkDocx(data, profile, opts) {
  return extractDocx(data).then(function (text) {
    return checkText(text, profile, opts);
  });
}

var API = {
  checkText: checkText,
  checkDocx: checkDocx,
  extractDocx: extractDocx,
  summary: summary,
  analyze: function (text, o) { return DET.analyze(text, KB, o || { profile: 'strict', lang: 'ru' }); },
  kb: KB,
  version: KB.version
};

/* Запуск из командной строки: node detector.bundle.js файл.docx strict [json] */
API.cli = function (argv, fsMod) {
  var file = argv[2], profile = argv[3] || 'strict', asJson = argv[4] === 'json';
  if (!file) {
    console.log('Использование: node detector.bundle.js файл.docx [strict|balanced|soft] [json]');
    return;
  }
  var data = fsMod.readFileSync(file);
  var done = function (res) {
    if (asJson) console.log(JSON.stringify({ file: file, profile: profile, result: res.report, text: res.text }, null, 1));
    else console.log(res.summary);
  };
  if (/\.docx$/i.test(file)) {
    checkDocx(data, profile, { title: file }).then(done, function (e) {
      console.error('Ошибка: ' + e.message); process.exitCode = 1;
    });
  } else {
    done(checkText(data.toString('utf8'), profile, { title: file }));
  }
};

  if (realModule && realModule.exports) realModule.exports = API;
  if (globalRoot) globalRoot.AIDetectorBundle = API;
  if (realModule && typeof require === 'function' && require.main === realModule) {
    API.cli(process.argv, require('fs'));
  }
})(typeof globalThis !== 'undefined' ? globalThis : this,
   typeof module === 'object' ? module : null);
