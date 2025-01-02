export function checkUserRoles(member) {
    const guildRoles = member.guild.roles.cache;
    const roles = [];

    for (const [, role] of guildRoles) {
        if (member.roles.cache.has(role.id)) {
            roles.push(role);
        }
    }

    return roles;
}