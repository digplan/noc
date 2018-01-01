const cli = {
  start: async (parentid, node, options)=>{
    
  },
  receive: ()=>{},
  send: (to, msg) => {}
}

const node = async () => {
  const f = r => {
    start: (parentid, options, transport_module) => {
      const transport = transport_module ? require(transport_module) : cli 
      await transport.start(parentid, this, options)
    },
    head: '', nodeid: '', nodes: [],
    getHash: entry => {
      return +new Date() + nodeid + entry
    },
    addEntry: entry => {},
    updateSM: entry => {},
    acceptEntry: entry => {},
    commitEntry: entry => {},
    refresh: ()=>{}
  }
  return new Promise(f)
}
module.exports = node
