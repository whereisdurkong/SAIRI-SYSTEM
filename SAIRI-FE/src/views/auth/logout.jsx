export default function LogOut() {
    localStorage.removeItem('user');
    window.location.replace('/');

}