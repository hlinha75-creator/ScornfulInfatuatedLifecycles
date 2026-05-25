const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('eventos')
    .setDescription('Listar eventos ativos'),

  async execute(interaction) {
    const events = db.prepare(`
      SELECT * FROM events 
      WHERE guild_id = ? AND datetime(date) > datetime('now')
      ORDER BY date ASC
    `).all(interaction.guild.id);

    if (events.length === 0) {
      return interaction.reply({ content: '📅 Nenhum evento futuro encontrado.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('📋 Eventos Agendados')
      .setColor('#00ff00');

    events.forEach(event => {
      const date = new Date(event.date);
      embed.addFields({
        name: `${event.title} (${event.type})`,
        value: `📅 <t:${Math.floor(date.getTime()/1000)}:F>\n👤 <@${event.created_by}>\n🆔 ${event.id}`
      });
    });

    await interaction.reply({ embeds: [embed] });
  }
};