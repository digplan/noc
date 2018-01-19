# noc
Not opinionated consensus

A distributed, replicated log, which doesn't require time syncronization between nodes, and is not tied to specific data formats, transports, or state machines.  

noc may be used to replicate a log between several servers (nodes), with or without an associated state machine.  Any node can contribute to the log through "commits" to the cluster.  noc logs may represent changes to a distributed database, or to an *individual record* in a distributed database.  Although, even an associated state machine is optional.

Since noc allows for various platform, language, and network transport options, nodes may exist as cluster members, in what would be typically labeled as *client* or *server* applications.  So, a traditional HTTP server may be node, but connected browsers may also be nodes in the cluster, as may other network servers.  

noc isn't transport dependent, so besides the most obvious means of communication between nodes (TCP), implmentations may have nodes communicate via SSH or other mechanisms.  Since noc does not define the transport, it has nothing to do with data security, so using ONLY encrypted network communications (eg.. HTTPS, SSH, etc..) is recommended.  noc itself does not define the means of keeping log files, although typically these would be kept on a disk volume.  Log files themselves may be encrypted if there is concern about their being read by those with access to the disk, but this is not defined by noc.  It would be in the Log file implementation.

noc is for logs. Not in the traditonal sense of server logs, but capturing changes to a (usually associated) state machine.  

For instance, in an HTTP "CRUD" application, an indvidual INSERT request or SQL command would be a log entry. The state machine is the database it's inserting into.  noc does not decide the implementation of the associated state machine.  You can implement one just by defining an object, class, executable, etc.. that will process an UPDATE command.  

The reference JavaScript application provides a basic state machine, which is simply a JSON object in memory.

In noc, the following terms are defined:

Cluster - a group of applications, usually one per server, that share a replicated log

Log - a replicated log, a text file that is replicated across a number of nodes

noc Cluster log - a special type of log, created at cluster startup, used by the nodes to track the other nodes in the cluster

Log item - an individual line in the log

Node - an individual application/server, member of a cluster

Head - a SHA256 hash value representing the current state of the log on a node, and timestamp all nodes in a cluster must share the same head value, in order to consider the log consistent/valid

Transation - an individual set of log entries, which is replicated across nodes

Commit request - a request made by a node, specific to a transaction, to the other nodes in the cluster, to confirm the transaction can be committed

State Machine - an underlying representation of state, whose changes are expressed in a log.  noc does not dictate what these state machines *are*, in fact, using State machines with NOC

Timestamp - a UNIX epoch time value, which represents the cluster 'time' of the commit

Refresh message - a request to the cluster for a refresh of the named log.  For logs that have backing state machines, a lighter "snapshot" may be requested.

Snapshot - a special type of shorter log, that starts with a representation of the state machine, and the log begins from there.  In a refresh request that a node issues to the cluster, the node may request a snapshot, requesting only the state machine and current HEAD of the log, instead of the entire log/transaction history. The node will then replicate logs, going forward from that point.

Transport - the means by which nodes communicate.  Most common would be TCP, but can be implemented in any way, for instance HTTPS, SSH, or even between shared memory or text files on a single computer.

Deregistration - removing a node from a cluster

##Log
A log is a text file, separated by \r\n.  The last line in the file is the initial HEAD line, which is a SHA256 value and timestamp.

Timestamps are interesting.  They are UNIX epoch values, for instance, 1516324544821 which is Thu Jan 18 2018 19:15:44 GMT-0600 (Central Standard Time), and represent the current time of the node where that transaction originated.

However, nodes in a noc cluster are not time synchronized.  There is no expectation about the accuracy of node's system time relative to other nodes.  Each node is assumed to have a different system time.  So, this timestamp represents an artificial "cluster time". It isn't absolutely necessary for ordering the commits, that is already done.  But allows selection of certain moments during the production of the log.

A log may look like this.  This log consists of a single transaction, with two statements (log lines).  The top line is the "HEAD", or current state of the log file, and is the SHA256 hash of the transaction plus the line below (the previous HEAD). The bottom line is the initial HEAD of this log.
````
ECDAFC73E572A52AE503C03E74B7F1E251116F1B553F08B6E09D57E65650BC89 1516324944522
INSERT INTO Customers (CustomerName) VALUES ('Bengal');
INSERT INTO Customers (CustomerName) VALUES ('Cardinal');
36A9E7F1C95B82FFB99743E0C5C4CE95D83C9A430AAC59F84EF3CBFAB6145068 1516324544821
````

You can see that by using logs, a database (state machine) may be fully regenerated from the log, or may be regenerated to the state it was at, at any point in time.  So, we may recreate a database, or that database as it existed at Noon yesterday.

##Snapshot
Logs can grow very large, so past logs can be truncated using snapshots.  A machine can detect a snapshot from a full log, because the bottom line of the file is not a HEAD value, as in a regular log, but part of a text (serialized) representation of the state machine.

A snapshot of a log with a JSON object "database" may look like this.  In order to use snapshots, the log must have a state machine that implements EXPORT.

````
A20B964BA8026F9FCC988885E8D81A0D0FD6D0E4F6D64217F1D13AA8EA523CB2 1516337176262
{data: [1,2,3,4,5,6]}
````

A new node may request a snapshot, in lieu of the full log.  The full log may also be discarded completely if history need not be kept, since the snapshot contains the complete state machine (as it existed at the time of the displayed HEAD timestamp).

##Node
A node creates a new cluster, or joins an existing cluster.  It composes a transaction of one or more lines, or gets it from another, perhaps an HTTP client, and calculates a new HEAD (SHA256 hash), consisting of the existing HEAD (top line of the log) and the new transaction lines. Then, it generates a Commmit Request to the other nodes in the cluster.  They check their HEAD value against that sent by the requestor. If it matches they send back an affirmative response, if not they send back a failure response.

The requestor, upon getting successful responses from all the nodes of the cluster, "commits" the transaction, updating its own log and sending a Commit message to all the other nodes, who update their logs.

##State machine
A state machine is usually a database of some kind, even if it is simply a JSON object.  But having a state machine for a log is optional.  noc does not define implementations of the state machine, so a state machine may be a database file stored on disk or memory, or even a connection to another system or database.  For instance, we may put a noc server in front of a MySQL database, in order to capture requests to that database, and replay them back later.

A state machine needs to implement just two functions. UPDATE (on every new committed transaction) and EXPORT (a text representation of the current state).

For instance, an in-memory web browser JSON object state machine may be defined like this.
````
const inMemJSON = {
  update: v => {
    window.db = window.db || []
    window.db.push(v)
  },
  export: () => {
    return JSON.stringify(window.db)
  }
}
````

##Log write
While a log must be a text file separated by line breaks, with HEAD lines that separate the transactions, the actual implementation of the log storage is not defined by noc.  So, logs may be stored in memory, on disk, or even on external network resources.

A log write implemention needs to just implement WRITE, so a simple disk storage in NodeJS may look like this.
````
const logDisk = {
  write: (logname, data) => {
    require(fs.appendFileSync(logname, data + '\r\n'));
  }
}
````

Or in-memory in a browser may look like this
````
const logBrowser = {
  write: (logname, data) => {
    const name = `log-${logname}`
    window[name] = window[name] || ''
    window[name] += data + '\r\n'
  }
}
````

##Cluster and Node startup
Each node can maintain any number of logs and state machines, to the extent local computing resources allow.  The only other data the node must manage, is the names of the other nodes in the cluster in order to communicate with them.  

This information itself is tracked as a noc log and state machine, called the "noc cluster log".    

The first node in a cluster "inits" the cluster, and creates the "noc cluster directory".  This simply tracks the members of the cluster and is kept as a log and state machine in each node.  Subsequent nodes send a commit request to the cluster to join the cluster, and if confirmed, sends a refresh message to get up to date with the cluster.

noc expects ALL nodes in the cluster to ALWAYS be ready and responding.  When any node is not responsive, the cluster is considered *partially disabled*.  When the node becomes operational again, it can request a refresh from the cluster, but if nodes are unresponsive for an extended amount of time, they are removed from the cluster.
