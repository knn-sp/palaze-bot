import axios from 'axios';

export async function setDescription(client) {
    const newDescription = `<:this_eyes:1172246699129970719> Gostou desse sistema? Fui desenvolvido por **knn9**`;

    try {
        const response = await axios.patch(
            `https://discord.com/api/v10/applications/${client.user.id}`,
            {
                description: newDescription,
            },
            {
                headers: {
                    Authorization: `Bot ${client.token}`,
                },
            }
        );

        console.log('Descrição da aplicação atualizada!');
    } catch (error) {
        console.error('Erro ao atualizar descrição da aplicação:', error.message);
    }
}