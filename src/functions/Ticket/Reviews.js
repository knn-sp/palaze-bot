export async function addServerReview(connection, serverId, rating) {
    try {
        const [existingRows] = await connection.execute('SELECT * FROM server_reviews WHERE server_id = ?', [serverId]);

        if (existingRows.length > 0) {
            await connection.execute(`
                UPDATE server_reviews
                SET
                    total_ratings = total_ratings + 1,
                    rating_count = rating_count + 1,
                    rating_sum = rating_sum + ?,
                    average_rating = (rating_sum + ?) / (rating_count + 1)
                WHERE server_id = ?
            `, [rating, rating, serverId]);
        } else {
            await connection.execute(`
                INSERT INTO server_reviews (server_id, total_ratings, rating_count, rating_sum, average_rating)
                VALUES (?, 1, 1, ?, ?)
            `, [serverId, rating, rating]);
        }

        console.log('Avaliação adicionada com sucesso.');
    } catch (error) {
        console.error('Erro ao adicionar avaliação: ' + error.message);
        throw error;
    }
}

export async function getServerReview(connection, serverId) {
    try {
        const [rows] = await connection.execute('SELECT * FROM server_reviews WHERE server_id = ?', [serverId]);

        if (rows.length > 0) {
            return {
                total_ratings: rows[0].total_ratings,
                rating_count: rows[0].rating_count,
                rating_sum: rows[0].rating_sum,
                average_rating: rows[0].average_rating
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error('Erro ao obter informações de avaliação do servidor: ' + error.message);
        throw error;
    }
}