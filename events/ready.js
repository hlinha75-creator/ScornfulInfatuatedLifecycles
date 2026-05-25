module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Bot online como ${client.user.tag}`);
    client.user.setActivity('Albion Online', { type: 3 }); // 3 = Watching
  }
};