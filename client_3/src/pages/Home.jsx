import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import FeatureShowcase from '../components/FeatureShowcase';
import AiTools from '../components/AiTools';
import Testimonial from '../components/Testimonial';
import Plan from '../components/Plan';
import Footer from '../components/Footer';

const Home = () => {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <AiTools />
        <FeatureShowcase />
        <Testimonial />
        <Plan />
      </main>
      <Footer />
    </>
  );
};

export default Home;
