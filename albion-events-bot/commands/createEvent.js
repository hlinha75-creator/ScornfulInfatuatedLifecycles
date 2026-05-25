const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('evento')
    .setDescription('Gerenciar eventos de Albion Online')
    .addSubcommand(sub =>
      sub
        .setName('criar')
        .setDescription('Criar um novo evento')
        .addStringOption(option =>
          option.setName('titulo').setDescription('Título do evento').setRequired(true))
        .addStringOption(option =>
          option.setName('tipo').setDescription('Tipo do evento')
            .setRequired(true)
            .addChoices(
              { name: 'ZvZ', value: 'ZvZ' },
              { name: 'Crystal League', value: 'Crystal' },
              { name: 'Hellgate', value: 'Hellgate' },
              { name: 'Corrupted Dungeon', value: 'Corrupted' },
              { name: 'Expedition', value: 'Expedition' },
              { name: 'GvG', value: 'GvG' },
              { name: 'Outros', value: 'Other' }
            ))
        .addStringOption(option =>
          option.setName('data').setDescription('Data e hora: DD/MM/AAAA HH:MM').setRequired(true))
        .addStringOption(option =>
          option.setName('descricao').setDescription('Descrição do evento').setRequired(false))
    ),

  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'criar') {
      const title = interaction.options.getString('titulo');
      const type = interaction.options.getString('tipo');
      const dateStr = interaction.options.getString('data');
      const description = interaction.options.getString('descricao') || 'Sem descrição';

      // Converter data para ISO
      const [day, month, year, hour, minute] = dateStr.match(/\d+/g);
      const date = new Date(year, month - 1, day, hour, minute);

      if (isNaN(date.getTime())) {
        return interaction.reply({ content: '❌ Data inválida! Use o formato: DD/MM/AAAA HH:MM', ephemeral: true });
      }

      const eventDate = date.toISOString();

      // Salvar no banco
      const stmt = db.prepare(`
        INSERT INTO events (guild_id, channel_id, title, type, date, description, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        interaction.guild.id,
        interaction.channel.id,
        title,
        type,
        eventDate,
        description,
        interaction.user.id
      );

      const eventId = result.lastInsertRowid;

      // Criar Embed
      const embed = new EmbedBuilder()
        .setTitle(`🎯 ${title}`)
        .setColor('#00b0ff')
        .addFields(
          { name: 'Tipo', value: type, inline: true },
          { name: 'Data', value: `<t:${Math.floor(date.getTime() / 1000)}:F>`, inline: true },
          { name: 'Organizador', value: `<@${interaction.user.id}>`, inline: true },
          { name: 'Descrição', value: description }
        )
        .setFooter({ text: `Evento ID: ${eventId}` })
        .setTimestamp();

      // Botões
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`join_dps_${eventId}`).setLabel('DPS').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
        new ButtonBuilder().setCustomId(`join_healer_${eventId}`).setLabel('Healer').setStyle(ButtonStyle.Success).setEmoji('➕'),
        new ButtonBuilder().setCustomId(`join_tank_${eventId}`).setLabel('Tank').setStyle(ButtonStyle.Danger).setEmoji('🛡️')
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`join_support_${eventId}`).setLabel('Support').setStyle(ButtonStyle.Secondary).setEmoji('📢'),
        new ButtonBuilder().setCustomId(`leave_${eventId}`).setLabel('Sair').setStyle(ButtonStyle.Secondary)
      );

      const message = await interaction.reply({ embeds: [embed], components: [row1, row2] });

      // Atualizar message_id no banco
      db.prepare('UPDATE events SET message_id = ? WHERE id = ?').run(message.id, eventId);
    }
  }
};