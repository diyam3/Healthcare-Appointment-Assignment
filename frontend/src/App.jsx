import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import DoctorSearch from './pages/patient/DoctorSearch';
import BookAppointment from './pages/patient/BookAppointment';
import PatientAppointments from './pages/patient/PatientAppointments';
import AppointmentDetail from './pages/patient/AppointmentDetail';
import DoctorSchedule from './pages/doctor/DoctorSchedule';
import ClinicalNotes from './pages/doctor/ClinicalNotes';
import DoctorLeave from './pages/doctor/DoctorLeave';
import AdminDoctors from './pages/admin/AdminDoctors';
import AdminLeave from './pages/admin/AdminLeave';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '14px', borderRadius: '10px', maxWidth: '380px' },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/patient/doctors" element={
            <ProtectedRoute allowedRoles={['patient']}><DoctorSearch /></ProtectedRoute>} />
          <Route path="/patient/book/:doctorId" element={
            <ProtectedRoute allowedRoles={['patient']}><BookAppointment /></ProtectedRoute>} />
          <Route path="/patient/appointments" element={
            <ProtectedRoute allowedRoles={['patient']}><PatientAppointments /></ProtectedRoute>} />
          <Route path="/patient/appointments/:id" element={
            <ProtectedRoute allowedRoles={['patient']}><AppointmentDetail /></ProtectedRoute>} />

          <Route path="/doctor/appointments" element={
            <ProtectedRoute allowedRoles={['doctor']}><DoctorSchedule /></ProtectedRoute>} />
          <Route path="/doctor/appointments/:id/notes" element={
            <ProtectedRoute allowedRoles={['doctor']}><ClinicalNotes /></ProtectedRoute>} />
          <Route path="/doctor/leave" element={
            <ProtectedRoute allowedRoles={['doctor']}><DoctorLeave /></ProtectedRoute>} />

          <Route path="/admin/doctors" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminDoctors /></ProtectedRoute>} />
          <Route path="/admin/doctors/:id/leave" element={
            <ProtectedRoute allowedRoles={['admin']}><AdminLeave /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}
