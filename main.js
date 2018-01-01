const https = {
  start: async ()=>{},
  receive: ()=>{},
  send: (cmd, msg) => {}
}

const node = async () => {
  const f = r => {
    start: (parentid, transport=https, options) => {
      await transport.start()
      this.nodes = this.getMembers()
      this.nodeid = ''
    },
    head: '', nodeid: '', nodes: [],
    getMembers: ()=>{},
    getHash: entry => {
      return +new Date() + nodeid + entry
    },
    addEntry: entry => {},
    initSM: ()=>{},
    initLog: ()=>{},
    updateSM: entry => {},
    acceptEntry: entry => {},
    commitEntry: entry => {},
    getRefreshed: ()=>{}
  }
  return new Promise(f)
}
module.exports = node
