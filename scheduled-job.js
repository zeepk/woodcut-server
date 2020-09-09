const axios = require('axios');

function massUpdate() {
	axios({
		method: 'put',
		url: 'https://hidden-oasis-88699.herokuapp.com/users/massupdate',
	}).then((response) => {
		console.log(response.data);
	});
}
massUpdate();
