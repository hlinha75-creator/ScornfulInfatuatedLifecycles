const db = require('../database');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: '❌ Ocorreu um erro ao executar este comando!', ephemeral: true });
      }
    }

    // Button Interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;
      const [action, role, eventId] = customId.split('_');

      if (!eventId) return;

      const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
      if (!event) {
        return interaction.reply({ content: '❌ Evento não encontrado!', ephemeral: true });
      }

      if (action === 'join') {
        try {
          db.prepare(`
            INSERT INTO event_participants (event_id, user_id, role)
            VALUES (?, ?, ?)
            ON CONFLICT(event_id, user_id) 
            DO UPDATE SET role = excluded.role
          `).run(eventId, interaction.user.id, role);

          await interaction.reply({ 
            content: `✅ Você entrou no evento como **${role.toUpperCase()}**!`, 
            ephemeral: true 
          });

          await updateEventEmbed(interaction, eventId);
        } catch (err) {
          await interaction.reply({ content: '❌ Erro ao entrar no evento.', ephemeral: true });
        }
      } 

      else if (action === 'leave') {
        db.prepare('DELETE FROM event_participants WHERE event_id = ? AND user_id = ?')
          .run(eventId, interaction.user.id);

        await interaction.reply({ content: '✅ Você saiu do evento.', ephemeral: true });
        await updateEventEmbed(interaction, eventId);
      }
    }
  }
};

// Função para atualizar o embed com participantes
async function updateEventEmbed(interaction, eventId) {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  const participants = db.prepare(`
    SELECT role, COUNT(*) as count, GROUP_CONCAT(user_id) as users 
    FROM event_participants 
    WHERE event_id = ? 
    GROUP BY role
  `).all(eventId);

  const embed = new EmbedBuilder()
    .setTitle(`🎯 ${event.title}`)
    .setColor('#00b0ff')
    .addFields(
      { name: 'Tipo', value: event.type, inline: true },
      { name: 'Data', value: `<t:${Math.floor(new Date(event.date).getTime() / 1000)}:F>`, inline: true },
      { name: 'Organizador', value: `<@${event.created_by}>`, inline: true },
      { name: 'Descrição', value: event.description || 'Sem descrição' }
    );

  // Adicionar participantes
  let participantsText = '';
  const roles = { 'dps': '⚔️ DPS', 'healer': '➕ Healer', 'tank': '🛡️ Tank', 'support': '📢 Support' };

  for (const p of participants) {
    participantsText += `${roles[p.role]}: **${p.count}** pessoas\n`;
  }

  if (participantsText) {
    embed.addFields({ name: 'Participantes', value: participantsText });
  } else {
    embed.addFields({ name: 'Participantes', value: 'Ninguém inscrito ainda.' });
  }

  embed.setFooter({ text: `Evento ID: ${eventId}` });

  // Atualizar mensagem
  const channel = await interaction.guild.channels.fetch(event.channel_id);
  const message = await channel.messages.fetch(event.message_id);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`join_dps_${eventId}`).setLabel('DPS').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
    new ButtonBuilder().setCustomId(`join_healer_${eventId}`).setLabel('Healer').setStyle(ButtonStyle.Success).setEmoji('➕'),
    new ButtonBuilder().setCustomId(`join_tank_${eventId}`).setLabel('Tank').setStyle(ButtonStyle.Danger).setEmoji('🛡️')
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`join_support_${eventId}`).setLabel('Support').setStyle(ButtonStyle.Secondary).setEmoji('📢'),
    new ButtonBuilder().setCustomId(`leave_${eventId}`).setLabel('Sair').setStyle(ButtonStyle.Secondary)
  );

  await message.edit({ embeds: [embed], components: [row1, row2] });
}